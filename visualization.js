function createVisualization(data) {
    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3.select("#visualizationContainer")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    const xExtent = d3.extent(data.nodes, d => d.x);
    const yExtent = d3.extent(data.nodes, d => d.y);

    const xScale = d3.scaleLinear()
        .domain(xExtent)
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([height - margin.bottom, margin.top]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create a group for zooming
    const g = svg.append("g");

    // Add a subtle background grid
    const grid = g.append("g")
        .attr("class", "grid");

    grid.selectAll("line.x")
        .data(d3.range(0, width, 50))
        .enter().append("line")
        .attr("class", "x")
        .attr("x1", d => d)
        .attr("x2", d => d)
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "#e0e0e0");

    grid.selectAll("line.y")
        .data(d3.range(0, height, 50))
        .enter().append("line")
        .attr("class", "y")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => d)
        .attr("y2", d => d)
        .style("stroke", "#e0e0e0");

    const nodes = g.selectAll("circle")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 7)
        .attr("fill", d => colorScale(d.topic))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("click", handleClick);

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");

    function handleMouseOver(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 10)
            .attr("stroke-width", 3);

        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`${d.title}<br/>Topic: ${d.topic}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }

    function handleMouseOut() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 7)
            .attr("stroke-width", 2);

        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    function handleClick(event, d) {
        console.log("Clicked node:", d);
        // You can add more complex interactions here
    }

    // Add zooming capability
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Add a legend with improved styling
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 20)`);

    const topics = [...new Set(data.nodes.map(d => d.topic))];

    const legendItems = legend.selectAll(".legend-item")
        .data(topics)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d => d)
        .attr("font-size", "12px")
        .attr("fill", "#333");

    // Add search functionality
    const searchInput = d3.select("#visualizationContainer")
        .insert("input", ":first-child")
        .attr("type", "text")
        .attr("placeholder", "Search nodes...")
        .style("margin-bottom", "10px")
        .style("padding", "5px")
        .style("width", "100%");

    searchInput.on("input", function() {
        const searchTerm = this.value.toLowerCase();
        nodes.attr("opacity", d => d.title.toLowerCase().includes(searchTerm) ? 1 : 0.1);
    });
}

window.createVisualization = createVisualization;