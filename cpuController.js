// controllers/cpuController.js
const awsSDK = require('aws-sdk');
const ec2 = new awsSDK.EC2();
const cloudWatch = new awsSDK.CloudWatch();

// controller function to get CPU usage
exports.getCpuUsage = async (req, res) => {
    const { ip, period, interval } = req.body;

    try {
        // translate IP to InstanceId
        const instanceId = await getInstanceId(ip);

        // Fetch CPU metrics from CloudWatch
        const metricsData = await getCpuMetrics(instanceId, period, interval);

        // send the response
        const formattedData = formatMetricsData(metricsData);
        res.json(formattedData);
    } catch (error) {
        // errors
        if (error.type === 'INSTANCE_NOT_FOUND') {
            console.warn("No matching instance found for IP:", ip);
            return res.status(404).json({ error: 'No instance found for the provided IP' });
        } else if (error.type === 'CLOUDWATCH_ERROR') {
            console.error("Error fetching data from CloudWatch:", error.message);
            return res.status(500).json({ error: 'Error fetching data from AWS CloudWatch' });
        } else if (error.type === 'EC2_ERROR') {
            console.error("Error describing instances:", error.message);
            return res.status(500).json({ error: 'Error retrieving instance details' });
        } else {
            console.error("Unexpected error:", error);
            return res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
};

// function to get InstanceId from IP address
const getInstanceId = async (ip) => {
    const paramsDescribeInstances = {
        Filters: [{ Name: 'private-ip-address', Values: [ip] }]
    };

    try {
        const data = await ec2.describeInstances(paramsDescribeInstances).promise();

        if (!data.Reservations.length || !data.Reservations[0].Instances.length) {
            const error = new Error('No instance found for the provided IP');
            error.type = 'INSTANCE_NOT_FOUND';
            throw error;
        }

        return data.Reservations[0].Instances[0].InstanceId;
    } catch (err) {
        const error = new Error(err.message);
        error.type = err.statusCode === 400 ? 'INSTANCE_NOT_FOUND' : 'EC2_ERROR';
        throw error;
    }
};

// function to get CPU metrics from CloudWatch
const getCpuMetrics = async (instanceId, period, interval) => {
    const paramsGetMetricStatistics = {
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: new Date(Date.now() - period * 1000).toISOString(),
        EndTime: new Date().toISOString(),
        Period: parseInt(interval, 10),
        Statistics: ['Average']
    };

    try {
        const metricsData = await cloudWatch.getMetricStatistics(paramsGetMetricStatistics).promise();
        return metricsData;
    } catch (err) {
        const error = new Error(err.message);
        error.type = 'CLOUDWATCH_ERROR';
        throw error;
    }
};

// function to format CloudWatch metrics data
const formatMetricsData = (metricsData) => {
    if (!metricsData.Datapoints || metricsData.Datapoints.length === 0) {
        return { timestamps: [], values: [] };
    }

    // sort datapoints by Timestamp in ascending order
    const sortedData = metricsData.Datapoints.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    return {
        timestamps: sortedData.map(dp => dp.Timestamp),
        values: sortedData.map(dp => dp.Average)
    };
};
