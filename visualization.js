function createVisualization(scatterPlotData, sunburstData) {
    console.log("Received visualization data:", { scatterPlotData, sunburstData });
    
    if (!scatterPlotData || !sunburstData || typeof scatterPlotData !== 'object' || typeof sunburstData !== 'object') {
        console.error("Invalid visualization data received");
        document.getElementById('visualizationContainer').textContent = "Invalid visualization data received.";
        return;
    }

    createScatterPlot(scatterPlotData);
    createSunburstChart(sunburstData);
}

function createScatterPlot(data) {
    const container = document.createElement('div');
    container.id = 'scatterPlotContainer';
    document.getElementById('visualizationContainer').appendChild(container);

    const trace = {
        x: data.map(d => d.x),
        y: data.map(d => d.y),
        mode: 'markers',
        type: 'scatter',
        marker: { color: data.map(d => d.topic), colorscale: 'Viridis' }
    };

    const layout = {
        title: 'Bookmark Topics Scatter Plot',
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' }
    };

    Plotly.newPlot(container, [trace], layout);
}

function createSunburstChart(data) {
    const container = document.createElement('div');
    container.id = 'sunburstContainer';
    document.getElementById('visualizationContainer').appendChild(container);

    // Process the sunburst data
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
        outsidetextfont: { size: 20, color: "#377eb8" },
        leaf: { opacity: 0.4 },
        marker: { line: { width: 2 } },
    };

    const layout = {
        margin: { l: 0, r: 0, b: 0, t: 50 },
        sunburstcolorway: ["#636efa","#ef553b","#00cc96","#ab63fa","#19d3f3",
                           "#e763fa","#fecb52","#ffa15a","#ff6692","#b6e880"],
        extendsunburstcolorway: true,
        title: 'Topic Hierarchy'
    };

    Plotly.newPlot(container, [trace], layout);
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

        const id = parentId + '/' + node.name;
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