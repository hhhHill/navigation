import { NodeImageProgram } from "https://cdn.jsdelivr.net/npm/@sigma/node-image@3.0.0/+esm";
import Sigma from 'https://cdn.jsdelivr.net/npm/sigma@3.0.2/+esm';
// Import Graph from Graphology

const graph = new graphology.Graph();
graph.addNode("cat", {
            x: 0,
             y: 0,
             size: 10,
            type: "image",
            label: "Cat",
            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sheba1.JPG/800px-Sheba1.JPG",
        });

const container = document.getElementById('sigma-container');

const sigma = new Sigma(graph, container, {
     nodeProgramClasses: {
     image: NodeImageProgram,
         },
});