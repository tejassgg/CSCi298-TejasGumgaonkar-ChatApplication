import os
import json
import numpy as np
import matplotlib.pyplot as plt

def load_perf_data(results_dir):
    data = []
    for file_name in os.listdir(results_dir):
        if file_name.endswith('.json'):
            with open(os.path.join(results_dir, file_name)) as f:
                data.append(json.load(f))
    return data

def plot_metrics(data):
    avg_latency = [entry['insights']['percentiles']['latency']['average'] for entry in data]
    max_latency = [entry['insights']['percentiles']['latency']['max'] for entry in data]
    avg_requests = [entry['insights']['percentiles']['requests']['average'] for entry in data]
    max_requests = [entry['insights']['percentiles']['requests']['max'] for entry in data]
    avg_throughput = [round(entry['insights']['percentiles']['throughput']['average'] / (1024 * 1024), 2) for entry in data]
    max_throughput = [round(entry['insights']['percentiles']['throughput']['max'] / (1024 * 1024), 2) for entry in data]
    error_rates = [(entry['insights']['failureCases']['errors'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]

    fig, axs = plt.subplots(2, 2, figsize=(15, 10))

    # Plot Average Latency
    axs[0, 0].plot(avg_latency, marker='o', label='Average Latency')
    axs[0, 0].plot(max_latency, marker='x', label='Max Latency')
    axs[0, 0].set_title('Response Times (Latency)')
    axs[0, 0].set_xlabel('Test Run(s)')
    axs[0, 0].set_ylabel('Latency (ms)')
    axs[0, 0].legend()
    axs[0, 0].grid(True)

    # Plot Requests per Second
    axs[0, 1].plot(avg_requests, marker='o', label='Average Requests per Second')
    axs[0, 1].plot(max_requests, marker='x', label='Max Requests per Second')
    axs[0, 1].set_title('Requests per Second')
    axs[0, 1].set_xlabel('Test Run(s)')
    axs[0, 1].set_ylabel('Requests per Second')
    axs[0, 1].legend()
    axs[0, 1].grid(True)

    # Plot Throughput
    axs[1, 0].plot(avg_throughput, marker='o', label='Average Throughput')
    axs[1, 0].plot(max_throughput, marker='x', label='Max Throughput')
    axs[1, 0].set_title('Throughput')
    axs[1, 0].set_xlabel('Test Run(s)')
    axs[1, 0].set_ylabel('Throughput (MB/sec)')
    axs[1, 0].legend()
    axs[1, 0].grid(True)

    # Plot Error Rates
    axs[1, 1].plot(error_rates, marker='o')
    axs[1, 1].set_title('Error Rates')
    axs[1, 1].set_xlabel('Test Run(s)')
    axs[1, 1].set_ylabel('Error Rate (%)')
    axs[1, 1].grid(True)

    plt.tight_layout()
    plt.show()

def plot_cpu_memory_usage(data):
    avg_cpu_usage = [float(entry['insights']['averageCpuUsage'].replace('%', '')) for entry in data]
    max_cpu_usage = [float(entry['insights']['maxCpuUsage'].replace('%', '')) for entry in data]
    avg_memory_usage = [float(entry['insights']['averageMemoryUsage'].replace('%', '')) for entry in data]
    max_memory_usage = [float(entry['insights']['maxMemoryUsage'].replace('%', '')) for entry in data]

    fig, axs = plt.subplots(2, 1, figsize=(10, 10))

    # Plot CPU Usage
    axs[0].plot(avg_cpu_usage, marker='o', label='Average CPU Usage')
    axs[0].plot(max_cpu_usage, marker='x', label='Max CPU Usage')
    axs[0].set_title('CPU Usage')
    axs[0].set_xlabel('Test Run(s)')
    axs[0].set_ylabel('CPU Usage (%)')
    axs[0].legend()
    axs[0].grid(True)

    # Plot Memory Usage
    axs[1].plot(avg_memory_usage, marker='o', label='Average Memory Usage')
    axs[1].plot(max_memory_usage, marker='x', label='Max Memory Usage')
    axs[1].set_title('Memory Usage')
    axs[1].set_xlabel('Test Run(s)')
    axs[1].set_ylabel('Memory Usage (%)')
    axs[1].legend()
    axs[1].grid(True)

    plt.tight_layout()
    plt.show()

def plot_boxplot(data):
    max_requests = [entry['insights']['percentiles']['requests']['max'] for entry in data]
    
    plt.figure(figsize=(10, 5))
    plt.boxplot(max_requests, vert=False)
    plt.xlabel('Requests per Second')
    plt.title('Boxplot of Max Requests per Second')
    plt.tight_layout()
    plt.show()

def print_summary(data):
    avg_throughput = [round(entry['insights']['percentiles']['throughput']['average'] / (1024 * 1024), 2) for entry in data]
    max_throughput = [round(entry['insights']['percentiles']['throughput']['max'] / (1024 * 1024), 2) for entry in data]
    avg_cpu_usage = [float(entry['insights']['averageCpuUsage'].replace('%', '')) for entry in data]
    max_cpu_usage = [float(entry['insights']['maxCpuUsage'].replace('%', '')) for entry in data]
    avg_memory_usage = [float(entry['insights']['averageMemoryUsage'].replace('%', '')) for entry in data]
    max_memory_usage = [float(entry['insights']['maxMemoryUsage'].replace('%', '')) for entry in data]
    avg_response_time = [entry['insights']['percentiles']['latency']['average'] for entry in data]
    max_response_time = [entry['insights']['percentiles']['latency']['max'] for entry in data]
    error_rates = [(entry['insights']['failureCases']['errors'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]

    print("Average Throughput (MB/sec):", avg_throughput)
    print("Max Throughput (MB/sec):", max_throughput)
    print("Min CPU Usage (%):", round(min(avg_cpu_usage), 2))
    print("Max CPU Usage (%):", round(max(max_cpu_usage), 2))
    print("Min Memory Usage (%):", round(min(avg_memory_usage), 2))
    print("Max Memory Usage (%):", round(max(max_memory_usage), 2))
    print("Average Response Time (ms):", avg_response_time)
    print("Max Response Time (ms):", max_response_time)
    print("Error Rates (%):", error_rates)

def main():
    results_dir = './perf_results'
    perf_data = load_perf_data(results_dir)
    
    plot_metrics(perf_data)
    plot_cpu_memory_usage(perf_data)
    plot_boxplot(perf_data)
    print_summary(perf_data)

if __name__ == "__main__":
    main()