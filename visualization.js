// visualization.js

function createVisualization(data) {
    console.log("Received visualization data:", data);
    
    if (!data || typeof data !== 'object') {
        console.error("Invalid visualization data received");
        document.getElementById('visualizationContainer').textContent = "Invalid visualization data received.";
        return;
    }

    if (data.type === "node-link") {
        createForceDirectedGraph(data);
    } else if (data.type === "plotly") {
        try {
            const plotlyData = JSON.parse(data.data);
            Plotly.newPlot('visualizationContainer', plotlyData.data, plotlyData.layout);
        } catch (error) {
            console.error("Error parsing Plotly data:", error);
            document.getElementById('visualizationContainer').textContent = "Error parsing visualization data.";
        }
    } else {
        console.error("Unsupported visualization type:", data.type || "unknown");
        document.getElementById('visualizationContainer').textContent = 
            "Unsupported visualization type. Please check the console for more information.";
    }
}

function createForceDirectedGraph(data) {
    console.log("Creating force-directed graph with data:", data);
    const container = document.getElementById('visualizationContainer');
    console.log("Container dimensions:", container.clientWidth, container.clientHeight);
    
    // Set minimum dimensions if the container is too small
    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 300);
    
    // Clear the container
    container.innerHTML = '';
    
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("background-color", "#f0f0f0");
    
    console.log("SVG created with dimensions:", width, height);
    
    // Create a group for the graph
    const graph = svg.append("g");
    
    // Initialize node positions within the SVG bounds
    data.nodes.forEach(node => {
        node.x = Math.random() * width;
        node.y = Math.random() * height;
    });

    // Create a color scale for topics
    const topics = [...new Set(data.nodes.map(node => node.topic))];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(topics);

    const simulation = d3.forceSimulation(data.nodes)
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(-30))
        .force("collision", d3.forceCollide().radius(10))
        .force("x", d3.forceX(width / 2).strength(0.1))
        .force("y", d3.forceY(height / 2).strength(0.1));
    
    // If links exist, add them to the simulation
    if (data.links && data.links.length > 0) {
        simulation.force("link", d3.forceLink(data.links).id(d => d.id).distance(50));
        
        const link = graph.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(data.links)
            .join("line");
    }

    const node = graph.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(data.nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", d => colorScale(d.topic || "default"))
        .call(drag(simulation));
    
    node.append("title")
        .text(d => `${d.title || "Untitled"} (Topic: ${d.topic || "Unknown"})`);
    
    console.log("Nodes added to SVG");
    
    simulation.on("tick", () => {
        // Constrain the nodes within the SVG bounds
        node
            .attr("cx", d => Math.max(5, Math.min(width - 5, d.x)))
            .attr("cy", d => Math.max(5, Math.min(height - 5, d.y)));
        
        if (data.links && data.links.length > 0) {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
        }
    });
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            graph.attr("transform", event.transform);
        });
    
    svg.call(zoom);
    
    // Add a legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 20)`);

    legend.selectAll("rect")
        .data(topics)
        .enter()
        .append("rect")
        .attr("y", (d, i) => i * 20)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => colorScale(d));

    legend.selectAll("text")
        .data(topics)
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", (d, i) => i * 20 + 9)
        .text(d => d)
        .style("font-size", "12px");

    console.log("Simulation started");
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// Make createVisualization available globally
window.createVisualization = createVisualization;