document.getElementById("config-form").addEventListener("submit", function (event) {
    event.preventDefault();
    runSimulation();
});

function runSimulation() {
    const initialUnits = parseFloat(document.getElementById("initial-units").value);
    const numberOfThrows = parseInt(document.getElementById("number-of-throws").value);
    const throwROI = parseFloat(document.getElementById("throw-roi").value);
    const probMinusOne = parseFloat(document.getElementById("prob-minus-one").value);
    const probZero = parseFloat(document.getElementById("prob-zero").value);
    const numberOfSimulations = parseInt(document.getElementById("number-of-simulations").value);

    const xi = [-1, 0, 1, 2];

    const probPlusOne = findProbs(probMinusOne, probZero, xi, throwROI);
    console.log("Optimal probability:", probPlusOne);
    const probPlusTwo = 1 - probMinusOne - probZero - probPlusOne;

    const pi = [probMinusOne, probZero, probPlusOne, probPlusTwo];
    console.log("ROI:", calculateMean(xi, pi));


    if (Math.abs(pi.reduce((a, b) => a + b, 0) - 1) > 0.001) {
        alert("Probabilities must sum to 1.");
        return;
    }

    displayDistribution(xi, pi);
    const results = simulateResults(numberOfSimulations, numberOfThrows, initialUnits, xi, pi);

    const ruin_count = results.results.filter(x => x < 1).length;
    const ruin_prob = ruin_count / numberOfSimulations;

    displayDescription(ruin_prob);
    displayHistogram(results.results);
    displayPaths(results.paths, numberOfThrows);
    displayQuantiles(results.quantiles, results.quantileValues);
}

function displayDistribution(values, probabilities) {
    const data = [{
        x: values,
        y: probabilities,
        type: 'bar'
    }];
    Plotly.newPlot('bar-plot', data, { title: 'Dice Distribution' });
}

function simulateResults(numSimulations, numThrows, initialUnits, values, probabilities) {
    const results = [];
    const paths = [];
    for (let i = 0; i < numSimulations; i++) {
        let currentUnits = initialUnits;
        let path = [currentUnits];
        for (let j = 0; j < numThrows; j++) {
            const randomValue = values[sampleIndex(probabilities)];
            currentUnits += randomValue;
            path.push(currentUnits);
            if (currentUnits < 1) break;
        }
        results.push(currentUnits);
        if (i < 10) paths.push(path);
    }
    const quantiles = [0.05, 0.25, 0.5, 0.75, 0.95];
    const quantileValues = quantiles.map(q => calculateQuantile(results, q));
    return { results, paths, quantiles, quantileValues };
}

function sampleIndex(probabilities) {
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random < cumulative) return i;
    }
    return probabilities.length - 1;
}

function calculateQuantile(arr, q) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function displayHistogram(results) {
    const data = [{
        x: results,
        type: 'histogram',
    }];
    Plotly.newPlot('histogram-plot', data, { title: 'Results Histogram' });
}

function displayPaths(paths, numThrows) {
    const data = paths.map(path => ({
        x: Array.from({ length: numThrows + 1 }, (_, i) => i),
        y: path,
        type: 'scatter',
        mode: 'lines',
        showlegend: false
    }));
    Plotly.newPlot('paths-plot', data, { title: 'Simulation Paths' });
}

function displayQuantiles(quantiles, quantileValues) {
    const quantilesBody = document.getElementById("quantiles-body");
    quantilesBody.innerHTML = ""; // Clear existing rows
    quantiles.forEach((quantile, index) => {
        const row = document.createElement("tr");
        const quantileCell = document.createElement("td");
        const valueCell = document.createElement("td");
        quantileCell.textContent = `${(quantile * 100).toFixed(1)}%`;
        valueCell.textContent = quantileValues[index].toFixed(2);
        row.appendChild(quantileCell);
        row.appendChild(valueCell);
        quantilesBody.appendChild(row);
    });
}

function displayDescription(risk_ruin) {
    const description = document.getElementById("description");
    description.innerHTML = ""; // Clear existing rows
    const content = document.createElement("p");
    content.textContent = `The simulated risk of ruin is ${(risk_ruin * 100).toFixed(2)}%`;
    description.appendChild(content);
}

// Calculate the mean of the discrete random variable
function calculateMean(values, probabilities) {
    return values.reduce((acc, value, index) => acc + value * probabilities[index], 0);
}

function findProbs(pMinus1, p0, xi, roi) {

    // Objective function to minimize
    function objective(p) {
        const complement = 1 - (pMinus1 + p0 + p);
        if (complement < 0) {
            return 1; // Invalid probability, set a high error
        }
        const probs = [pMinus1, p0, p, complement];
        const mean = calculateMean(xi, probs);
        return Math.pow(mean - roi, 2); // Squared error
    }

    // Manually search for the minimum by incrementing p from 0 to 1 by 0.001
    let bestP = 0;
    let bestError = Infinity;
    const increment = 0.0001;

    for (let p = 0; p <= 1; p += increment) {
        const error = objective(p);
        if (error < bestError) {
            bestError = error;
            bestP = p;
        }
    }

    return bestP;
}
