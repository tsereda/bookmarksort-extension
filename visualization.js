// visualization.js

function createVisualization(data) {
    console.log("Received visualization data:", data);
    
    if (!data || typeof data !== 'object' || !data.nodes || !Array.isArray(data.nodes)) {
        console.error("Invalid visualization data received");
        document.getElementById('visualizationContainer').textContent = "Invalid visualization data received.";
        return;
    }

    createHybridGraph(data);
}

function createHybridGraph(data) {
    const container = document.getElementById('visualizationContainer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    container.innerHTML = '';
    
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("background-color", "#f0f0f0");
    
    const graph = svg.append("g");

    // Ensure all nodes have a topic
    data.nodes.forEach(node => {
        if (!node.topic) {
            node.topic = "Uncategorized";
        }
    });

    // Scale the x and y coordinates to fit the SVG dimensions
    const xExtent = d3.extent(data.nodes, d => d.x);
    const yExtent = d3.extent(data.nodes, d => d.y);
    const xScale = d3.scaleLinear().domain(xExtent).range([50, width - 50]);
    const yScale = d3.scaleLinear().domain(yExtent).range([50, height - 50]);

    data.nodes.forEach(node => {
        node.x = xScale(node.x);
        node.y = yScale(node.y);
    });

    // Create a root node to connect all topics
    const rootNode = { id: "root", topic: null, x: width / 2, y: height / 2 };
    data.nodes.push(rootNode);

    // Create hierarchical structure
    const stratify = d3.stratify()
        .id(d => d.id)
        .parentId(d => d.topic === null ? null : "root");

    const root = stratify(data.nodes);

    // Create a color scale for topics
    const topics = [...new Set(data.nodes.map(node => node.topic))];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(topics);

    // Create links based on the hierarchical structure
    const links = root.links().filter(link => link.source.id !== "root");

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(30).strength(0.05))
        .force("charge", d3.forceManyBody().strength(-10))
        .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
        .force("x", d3.forceX(d => d.x).strength(0.2))
        .force("y", d3.forceY(d => d.y).strength(0.2));

    const link = graph.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

    const node = graph.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(data.nodes.filter(d => d.id !== "root"))
        .join("circle")
        .attr("r", 5)
        .attr("fill", d => colorScale(d.topic || "default"))
        .call(drag(simulation));

    node.append("title")
        .text(d => `${d.title || "Untitled"} (Topic: ${d.topic || "Unknown"})`);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
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

window.createVisualization = createVisualization;