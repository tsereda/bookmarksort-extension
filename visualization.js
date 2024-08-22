function createVisualization(scatterPlotData, sunburstData) {
    console.log("Received visualization data:", { scatterPlotData, sunburstData });
    
    if (!scatterPlotData || !sunburstData || typeof scatterPlotData !== 'object' || typeof sunburstData !== 'object') {
        console.error("Invalid visualization data received");
        document.getElementById('scatterPlotContainer').textContent = "Invalid visualization data received.";
        document.getElementById('sunburstContainer').textContent = "Invalid visualization data received.";
        return;
    }

    createScatterPlot(scatterPlotData);
    createSunburstChart(sunburstData);
}

function createScatterPlot(data) {
    const container = document.getElementById('scatterPlotContainer');
    if (!container) {
        console.error("Scatter plot container not found");
        return;
    }

    const trace = {
        x: data.map(d => d.x),
        y: data.map(d => d.y),
        mode: 'markers',
        type: 'scatter',
        marker: { color: data.map(d => d.topic), colorscale: 'Viridis' },
        text: data.map(d => `<b>Title:</b> ${d.title}<br><b>URL:</b> ${d.url}<br><b>Tags:</b> ${d.tags.join(', ')}<br><b>Topic:</b> ${d.topicName}`),
        hoverinfo: 'text'
    };

    const layout = {
        title: 'Bookmark Topics Scatter Plot',
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        autosize: true,
        margin: { l: 40, r: 40, b: 40, t: 40, pad: 4 },
        hovermode: 'closest'
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot(container, [trace], layout, config);

    container.on('plotly_click', function(data) {
        if (data.points.length > 0) {
            const point = data.points[0];
            const pointData = trace.text[point.pointIndex];
            alert(pointData);  // You can replace this with a more sophisticated display method
        }
    });
}

function createSunburstChart(data) {
    const container = document.getElementById('sunburstContainer');
    if (!container) {
        console.error("Sunburst container not found");
        return;
    }

    const processedData = processSunburstData(data);

    if (!processedData) {
        console.error("Invalid sunburst data structure");
        container.textContent = "Invalid sunburst data structure.";
        return;
    }

    const trace = {
        type: "sunburst",
        ids: processedData.ids,
        labels: processedData.labels,
        parents: processedData.parents,
        values: processedData.values,
        branchvalues: 'total',
        outsidetextfont: { size: 14, color: "#377eb8" },
        leaf: { opacity: 0.4 },
        marker: { line: { width: 2 } },
    };

    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 40 },
        sunburstcolorway: ["#636efa","#ef553b","#00cc96","#ab63fa","#19d3f3",
                           "#e763fa","#fecb52","#ffa15a","#ff6692","#b6e880"],
        extendsunburstcolorway: true,
        title: 'Topic Hierarchy',
        autosize: true
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot(container, [trace], layout, config);
}

function processSunburstData(data) {
    if (!data || typeof data !== 'object') {
        console.error("Invalid sunburst data");
        return null;
    }

    const ids = [];
    const labels = [];
    const parents = [];
    const values = [];

    function addNode(node, parentId = "") {
        if (!node || typeof node !== 'object' || !node.name) {
            console.warn("Invalid node data:", node);
            return;
        }

        const id = parentId ? parentId + '/' + node.name : node.name;
        ids.push(id);
        labels.push(node.name);
        parents.push(parentId);
        values.push(node.value || 0);

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => addNode(child, id));
        }
    }

    addNode(data);

    return { ids, labels, parents, values };
}

window.createVisualization = createVisualization;

window.addEventListener('resize', function() {
    Plotly.Plots.resize('scatterPlotContainer');
    Plotly.Plots.resize('sunburstContainer');
});