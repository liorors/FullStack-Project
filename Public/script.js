//script.js
document.addEventListener('DOMContentLoaded', () => {
    // register an event that is called when the page is fully loaded
    const loadButton = document.getElementById('loadButton');
    // find the button and save it in a variable

    //time periods --> readable text
    const periodMapping = {
        '3600': 'Last Hour',
        '86400': 'Last Day',
        '604800': 'Last Week'
    };

    // minimal time intervals
    const minimumIntervals = {
        'Last Hour': 60,
        'Last Day': 120,
        'Last Week': 1200
    };

    // register an event for clicking the load button
    loadButton.addEventListener('click', () => {
        // collect users values
        const ip = document.getElementById('ip').value;
        const periodValue = document.getElementById('time-period').value;
        let interval = parseInt(document.getElementById('interval').value, 10);
        // convert to readable text
        const periodText = periodMapping[periodValue] || '';
        // validate the interval with a possible error message
        const errorMessage = validateInterval(periodText, interval);

        // error message --> display it and stop execution
        if (errorMessage) {
            alert(errorMessage);
            return;
        }

        // convert the interval to the nearest number divisible by 60
        //Period parameter used with CloudWatch must be a multiple of 60
        const roundedInterval = roundToNearestMultiple(interval, 60);
        // send the CPU data after the 60 convertion
        fetchCPUData(ip, periodValue, roundedInterval);
    });

    // function to round a number to the nearest multiple
    const roundToNearestMultiple = (num, multiple) => {
        return Math.round(num / multiple) * multiple;
    };

    // function to validate the interval based on the required minimum intervals
    const validateInterval = (period, currentInterval) => {
        const minInterval = minimumIntervals[period];
        if (currentInterval < minInterval) {
            // update the input field with the appropriate minimum
            document.getElementById('interval').value = minInterval;
            return `The minimum interval for "${period}" is ${minInterval} seconds to ensure performance.\n`;
        }
        return '';
    };

    // function to fetch CPU usage data from the server
    const fetchCPUData = (ip, period, interval) => {
        fetch('/api/cpu/usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, period, interval })
        })
            .then(response => response.ok ? response.json() : Promise.reject('Failed to fetch CPU usage data'))
            .then(data => {
                if (!data.timestamps || data.timestamps.length === 0) {
                    alert("No CPU usage data available for the selected IP and parameters.");
                    return;
                }
                // update the chart with the fetched data
                updateChart(data, periodMapping[period]);
            })
            .catch(error => {
                console.error('Error fetching CPU data:', error);
                alert('An error occurred while loading the CPU data. Please try again.');
            });
    };

    // function to update the chart with new data
    const updateChart = (data, periodText) => {
        const ctx = document.getElementById('cpuChart').getContext('2d');
        const sortedData = data.timestamps.map((timestamp, index) => ({
            x: timestamp,
            y: data.values[index]
        })).sort((a, b) => new Date(a.x) - new Date(b.x));

        // reduce data points for large data sets
        const reducedData = (periodText === 'Last Week' && sortedData.length > 1000)
            ? reduceDataPoints(sortedData, 1000)
            : sortedData;

        // create the chart
        createChart(ctx, reducedData, periodText);
    };

    // function to reduce the number of data points for better visualization
    const reduceDataPoints = (data, maxPoints) => {
        const step = Math.ceil(data.length / maxPoints);
        return data.filter((_, index) => index % step === 0);
    };

    //function to define and create the chart
    const createChart = (ctx, data, periodText) => {
        // Check if a chart instance exists and destroy it
        const existingChart = Chart.getChart("cpuChart");
        if (existingChart) existingChart.destroy();

        // set new chart options according to the period
        const { timeUnit, displayFormats, maxTicks } = configureChartOptions(periodText);

        // create a new chart instance
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Metric Data',
                    data,
                    fill: true,
                    borderColor: 'rgb(239, 51, 64)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(239, 51, 64)',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.4
                }]
            },
            options: {
                maintainAspectRatio: true,
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: timeUnit, displayFormats },
                        title: { display: true, text: 'Time' },
                        ticks: { autoSkip: true, maxTicksLimit: maxTicks },
                        grid: { display: true, color: 'rgba(200, 200, 200, 0.7)' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Percentage' },
                        grid: { display: true, color: 'rgba(200, 200, 200, 0.7)' },
                        ticks: { callback: value => `${value}%` }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `CPU Usage: ${context.parsed.y}%`
                        }
                    },
                    legend: { display: true, position: 'top' }
                }
            }
        });
    };

    // function to configure chart options based on the selected period
    const configureChartOptions = (periodText) => {
        if (periodText === 'Last Week') {
            return {
                timeUnit: 'hour',
                displayFormats: { hour: 'ddd h:mm A' }, // AM/PM format
                maxTicks: 24 // maximum 24 ticks
            };
        } else if (periodText === 'Last Day') {
            return {
                timeUnit: 'hour',
                displayFormats: { hour: 'h:mm A' }, // AM/PM format
                maxTicks: 24
            };
        } else { // Last Hour
            return {
                timeUnit: 'minute',
                displayFormats: { minute: 'h:mm:ss A' }, // Format minute with AM/PM
                maxTicks: 24
            };
        }
    };
});
