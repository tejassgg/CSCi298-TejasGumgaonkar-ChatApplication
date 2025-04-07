const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Function to delete all files in the perf_results folder
function clearPerfResults() {
    const resultsDir = path.join(__dirname, '../perf_results');
    fs.readdir(resultsDir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(resultsDir, file), (err) => {
                if (err) throw err;
            });
        }
        console.log('All files deleted from perf_results folder');
    });
}

// Function to run the load test
function runLoadTest(n, delay) {
    for (let i = 0; i < n; i++) {
        setTimeout(() => {
            exec('node autocannonloadtest.js', (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error executing autocannonloadtest.js: ${err}`);
                    return;
                }
                console.log(`Run ${i + 1} completed:\n${stdout}`);
            });
        }, i * delay);
    }
}

// Main function
function main() {
    const testRuns = 2; // Number of times to run the test
    const delay = 20000; // Delay in milliseconds (10 seconds)
    // clearPerfResults();
    runLoadTest(testRuns, delay);
}

main();