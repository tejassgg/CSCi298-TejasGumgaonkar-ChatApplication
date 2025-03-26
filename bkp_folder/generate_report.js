const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function generateReport() {
    try {
        // Call the API endpoint to get the number of messages
        const response = await axios.get('http://localhost:3000/api/message-count');
        const messageCount = response.data.count;

        // Generate report
        const report = {
            messageCount
        };

        // Write report to file
        const reportPath = path.join("../perf_results", 'load_test_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log('Report generated at', reportPath);

    } catch (error) {
        console.error('Error generating report:', error);
    }
}

// Call the function to generate report
generateReport();
