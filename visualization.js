function createVisualization(data) {
    console.log("Received visualization data:", data);
    
    if (!data || typeof data !== 'object') {
        console.error("Invalid visualization data received");
        document.getElementById('visualizationContainer').textContent = "Invalid visualization data received.";
        return;
    }

    if (data.root) {
        createTopicTree(data);
    } else if (Array.isArray(data)) {
        createHierarchicalTopics(data);
    } else {
        console.error("Unknown data format");
        document.getElementById('visualizationContainer').textContent = "Unknown data format received.";
    }
}

function createTopicTree(data) {
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

    const g = svg.append("g");

    const root = d3.hierarchy(data.root);
    
    const treeLayout = d3.tree().size([height - 100, width - 160]);
    treeLayout(root);

    const link = g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("r", 5);

    node.append("text")
        .attr("dy", ".31em")
        .attr("x", d => d.children ? -8 : 8)
        .style("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name);

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
}

function createHierarchicalTopics(data) {
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

    const g = svg.append("g");

    const pack = d3.pack()
        .size([width - 40, height - 40])
        .padding(10);

    const root = d3.hierarchy({children: data})
        .sum(d => d.Topics ? d.Topics.length : 0);

    const nodes = pack(root).descendants();

    const node = g.selectAll("g")
        .data(nodes)
        .enter().append("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => d.children ? "#69b3a2" : "#E8A87C")
        .attr("opacity", 0.7);

    node.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(d => d.data.Parent_Name || d.data.Child_Left_Name || d.data.Child_Right_Name)
        .style("font-size", function(d) {
            return `${Math.min(2 * d.r, (2 * d.r - 8) / this.getComputedTextLength() * 12)}px`;
        });

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
}

window.createVisualization = createVisualization;