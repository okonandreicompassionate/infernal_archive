import React, { useState, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import * as d3 from "d3";
import {
  Globe,
  Users,
  Shield,
  Zap,
  Sword,
  Filter,
  Network,
  RefreshCw,
} from "lucide-react";

export const UniverseGraph: React.FC = () => {
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [rawCharacters, setRawCharacters] = useState<any[]>([]);
  const [rawTeams, setRawTeams] = useState<any[]>([]);
  const [rawLocations, setRawLocations] = useState<any[]>([]);
  const [rawArtifacts, setRawArtifacts] = useState<any[]>([]);
  const [rawRelationships, setRawRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"d3" | "reactflow">("d3");
  const [filterType, setFilterType] = useState("ALL");
  const [hoveredNode, setHoveredNode] = useState<any>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/characters").then((res) => res.json()),
      fetch("/api/teams").then((res) => res.json()),
      fetch("/api/locations").then((res) => res.json()),
      fetch("/api/artifacts").then((res) => res.json()),
      fetch("/api/relationships").then((res) => res.json()),
    ])
      .then(([characters, teams, locations, artifacts, relationships]) => {
        setRawCharacters(characters);
        setRawTeams(teams);
        setRawLocations(locations);
        setRawArtifacts(artifacts);
        setRawRelationships(relationships);

        const nodesList: Node[] = [];
        const edgesList: Edge[] = [];

        characters.forEach((c: any, index: number) => {
          nodesList.push({
            id: c.id,
            data: { label: c.name || c.codeName },
            position: {
              x: (index % 4) * 220 + 50,
              y: Math.floor(index / 4) * 120 + 50,
            },
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #4f46e5",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 600,
            },
          });
        });

        teams.forEach((t: any, index: number) => {
          nodesList.push({
            id: t.id,
            data: { label: `🛡️ ${t.name}` },
            position: { x: (index % 3) * 280 + 100, y: 400 },
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #06b6d4",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 600,
            },
          });
        });

        locations.forEach((l: any, index: number) => {
          nodesList.push({
            id: l.id,
            data: { label: `📍 ${l.name}` },
            position: { x: (index % 3) * 280 + 100, y: 600 },
            style: {
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #10b981",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12px",
              fontWeight: 600,
            },
          });
        });

        relationships.forEach((r: any) => {
          edgesList.push({
            id: r.id,
            source: r.source,
            target: r.target,
            label: r.type,
            animated: true,
            style: { stroke: "#818cf8", strokeWidth: 2 },
            labelStyle: { fill: "#a1a1aa", fontWeight: 500, fontSize: 10 },
          });
        });

        setFlowNodes(nodesList);
        setFlowEdges(edgesList);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // D3 Force Directed Graph Effect
  useEffect(() => {
    if (viewMode !== "d3" || loading || !svgRef.current) return;

    const width = svgRef.current.clientWidth || 900;
    const height = 650;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Container group for zoom & pan
    const g = svg.append("g");

    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Prepare nodes and links data
    const nodesMap = new Map();

    rawCharacters.forEach((c) => {
      if (filterType === "ALL" || filterType === "characters") {
        nodesMap.set(c.id, {
          id: c.id,
          name: c.name || c.codeName,
          type: "Character",
          group: 1,
        });
      }
    });
    rawTeams.forEach((t) => {
      if (filterType === "ALL" || filterType === "teams") {
        nodesMap.set(t.id, { id: t.id, name: t.name, type: "Team", group: 2 });
      }
    });
    rawLocations.forEach((l) => {
      if (filterType === "ALL" || filterType === "locations") {
        nodesMap.set(l.id, {
          id: l.id,
          name: l.name,
          type: "Location",
          group: 3,
        });
      }
    });
    rawArtifacts.forEach((a) => {
      if (filterType === "ALL" || filterType === "artifacts") {
        nodesMap.set(a.id, {
          id: a.id,
          name: a.title,
          type: "Artifact",
          group: 4,
        });
      }
    });

    const links: any[] = [];
    rawRelationships.forEach((r) => {
      if (nodesMap.has(r.source) && nodesMap.has(r.target)) {
        links.push({
          source: r.source,
          target: r.target,
          type: r.type,
          description: r.description,
        });
      }
    });

    const nodes = Array.from(nodesMap.values());

    // Simulation setup
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#4f46e5")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Link Labels
    const linkText = g
      .append("g")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .text((d: any) => d.type)
      .attr("fill", "#a1a1aa")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("text-anchor", "middle");

    // Node groups
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // Node Circles
    node
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d: any) =>
        d.type === "Character"
          ? "#4f46e5"
          : d.type === "Team"
            ? "#06b6d4"
            : d.type === "Location"
              ? "#10b981"
              : "#f59e0b",
      )
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .on("mouseover", (event, d: any) => setHoveredNode(d))
      .on("mouseout", () => setHoveredNode(null));

    // Node Icons / Text
    node
      .append("text")
      .text((d: any) => d.name)
      .attr("x", 28)
      .attr("y", 4)
      .attr("fill", "#f4f4f5")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("font-family", "sans-serif");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkText
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 4);

      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });
  }, [
    viewMode,
    loading,
    filterType,
    rawCharacters,
    rawTeams,
    rawLocations,
    rawArtifacts,
    rawRelationships,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-zinc-400 text-xs">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mr-2"></div>
        Building Universe Knowledge Graph...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
            Universe Knowledge Graph & Force Simulation
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Interactive D3.js force-directed network and ReactFlow visualization
            connecting characters, teams, locations, and artifacts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setViewMode("d3")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                viewMode === "d3"
                  ? "bg-yellow-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>D3 Force Graph</span>
            </button>
            <button
              onClick={() => setViewMode("reactflow")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                viewMode === "reactflow"
                  ? "bg-yellow-400 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>ReactFlow Tree</span>
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-yellow-400"
          >
            <option value="ALL">All Categories</option>
            <option value="characters">Characters Only</option>
            <option value="teams">Teams Only</option>
            <option value="locations">Locations Only</option>
            <option value="artifacts">Artifacts Only</option>
          </select>

          <button
            onClick={loadData}
            title="Reset Graph Simulation"
            className="p-2 bg-zinc-900 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl border border-white/5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[70vh] w-full rounded-2xl border border-white/5 bg-zinc-950 overflow-hidden shadow-2xl relative">
        {viewMode === "d3" ? (
          <div className="w-full h-full relative">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />
            <div className="absolute bottom-4 left-4 bg-white/[0.03] backdrop-blur border border-white/5 p-3 rounded-2xl text-xs space-y-1.5 shadow-lg pointer-events-none">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Legend
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
                <span className="text-zinc-300">Characters</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
                <span className="text-zinc-300">Teams</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-zinc-300">Locations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="text-zinc-300">Artifacts</span>
              </div>
            </div>
            {hoveredNode && (
              <div className="absolute top-4 right-4 bg-zinc-900/95 backdrop-blur border border-yellow-400/50 p-3 rounded-2xl text-xs space-y-1 shadow-2xl">
                <div className="text-[10px] font-mono text-yellow-400 uppercase">
                  {hoveredNode.type}
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  {hoveredNode.name}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  ID: {hoveredNode.id}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            fitView
            style={{ background: "#09090b" }}
          >
            <Background color="#27272a" gap={24} />
            <Controls />
            <MiniMap
              style={{ background: "#18181b", border: "1px solid #27272a" }}
              nodeColor="#4f46e5"
              maskColor="rgba(0, 0, 0, 0.6)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
