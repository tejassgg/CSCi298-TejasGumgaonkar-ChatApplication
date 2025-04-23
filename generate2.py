import os
import json
import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import make_interp_spline

def load_perf_data(results_dir):
    data = []
    for file_name in os.listdir(results_dir):
        if file_name.endswith('.json'):
            with open(os.path.join(results_dir, file_name)) as f:
                data.append(json.load(f))
    return data

def generate_all_graphs(data):
    # Prepare data for graphs
    test_runs = range(1, len(data) + 1)
    number_of_messages_sent = [entry['insights'].get('numberOfMessagesSent', 0) for entry in data]
    number_of_files_sent = [entry['insights'].get('numberOfFilesSent', 0) for entry in data]
    difference_in_messages_and_files = [
        abs(msg - files) for msg, files in zip(number_of_messages_sent, number_of_files_sent)
    ]
    avg_latency = [entry['insights']['percentiles']['latency']['average'] for entry in data]
    max_latency = [entry['insights']['percentiles']['latency']['max'] for entry in data]
    min_latency = [entry['insights']['percentiles']['latency']['min'] for entry in data]
    avg_requests = [entry['insights']['percentiles']['requests']['average'] for entry in data]
    max_requests = [entry['insights']['percentiles']['requests']['max'] for entry in data]
    min_requests = [entry['insights']['percentiles']['requests']['min'] for entry in data]
    avg_throughput = [round(entry['insights']['percentiles']['throughput']['average'] / (1024 * 1024), 2) for entry in data]
    max_throughput = [round(entry['insights']['percentiles']['throughput']['max'] / (1024 * 1024), 2) for entry in data]
    error_rates = [(entry['insights']['failureCases']['errors'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]
    non2xx_rates = [(entry['insights']['failureCases']['non2xx'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]
    avg_cpu_usage = [float(entry['insights']['averageCpuUsage'].replace('%', '')) for entry in data]
    max_cpu_usage = [float(entry['insights']['maxCpuUsage'].replace('%', '')) for entry in data]
    avg_memory_usage = [float(entry['insights']['averageMemoryUsage'].replace('%', '')) for entry in data]
    max_memory_usage = [float(entry['insights']['maxMemoryUsage'].replace('%', '')) for entry in data]

    # Create a figure with multiple subplots (minimum 4 per screen)
    fig, axs = plt.subplots(2, 2, figsize=(16, 24))  # 2 rows, 2 columns
    fig, axs1 = plt.subplots(2, 2, figsize=(16, 24))  # 2 rows, 2 columns
    
    # Plot 1: Number of Messages Sent
    axs[0, 0].plot(test_runs, number_of_messages_sent, marker="o", label="Messages Sent", color="red")
    axs[0, 0].plot(test_runs, number_of_files_sent, marker="o", label="Files Sent", color="green")
    axs[0, 0].set_title("Messages Sent Over Test Runs")
    axs[0, 0].set_xlabel("Test Runs")
    axs[0, 0].set_ylabel("Messages Sent")
    axs[0, 0].legend()
    axs[0, 0].grid(True)

    # Plot 2: Number of Requests Sent
    axs[0, 1].plot(avg_requests,  marker="o", label="Avg # of Reqs", color="green")    
    axs[0, 1].plot(max_requests,  marker="x", label="Max # of Reqs", color="yellow")
    axs[0, 1].plot(min_requests,  marker="+", label="Min # of Reqs", color="blue")
    axs[0, 1].set_title("Number of Requests Sent Over Test Runs")
    axs[0, 1].set_xlabel("Test Runs")
    axs[0, 1].set_ylabel("Number of Requests Sent")
    axs[0, 1].legend()
    axs[0, 1].grid(True)

    # Plot 3: Difference Between Messages and Files Sent
    axs[1, 0].plot(test_runs, difference_in_messages_and_files, marker="o", label="Difference", color="orange")
    axs[1, 0].set_title("Difference Between Messages and Files Sent")
    axs[1, 0].set_xlabel("Test Runs")
    axs[1, 0].set_ylabel("Difference")
    axs[1, 0].legend()
    axs[1, 0].grid(True)

    # Plot 4: Average Latency
    axs[1, 1].plot(avg_latency, marker='o', label='Average Latency', color="blue")
    axs[1, 1].plot(max_latency, marker='x', label='Max Latency', color="orange")
    axs[1, 1].plot(min_latency, marker='|', label='Min Latency', color="green")
    axs[1, 1].set_title('Latency Over Test Runs')
    axs[1, 1].set_xlabel('Test Runs')
    axs[1, 1].set_ylabel('Latency (ms)')
    axs[1, 1].legend()
    axs[1, 1].grid(True)

    # Plot 5: Average Throughput
    axs1[0, 0].plot(avg_throughput, marker='o', label='Average Throughput', color="purple")
    axs1[0, 0].plot(max_throughput, marker='x', label='Max Throughput', color="red")
    axs1[0, 0].set_title("Throughput Over Test Runs")
    axs1[0, 0].set_xlabel("Test Runs")
    axs1[0, 0].set_ylabel("Throughput (MB/sec)")
    axs1[0, 0].legend()
    axs1[0, 0].grid(True)

    # Plot 6: Error Rates
    axs1[0, 1].plot(error_rates, marker='o', label="Error Rates", color="brown")
    axs1[0, 1].plot(non2xx_rates, marker='x', label="Non-2xx Rates", color="cyan")
    axs1[0, 1].set_title("Error Rates Over Test Runs")
    axs1[0, 1].set_xlabel("Test Runs")
    axs1[0, 1].set_ylabel("Error Rate (%)")
    axs1[0, 1].legend()
    axs1[0, 1].grid(True)

    # Plot 7: CPU Usage
    axs1[1, 0].plot(avg_cpu_usage, marker='o', label='Average CPU Usage', color="magenta")
    axs1[1, 0].plot(max_cpu_usage, marker='x', label='Max CPU Usage', color="darkred")
    axs1[1, 0].set_title('CPU Usage Over Test Runs')
    axs1[1, 0].set_xlabel('Test Runs')
    axs1[1, 0].set_ylabel('CPU Usage (%)')
    axs1[1, 0].legend()
    axs1[1, 0].grid(True)

    # Plot 8: Memory Usage
    axs1[1, 1].plot(avg_memory_usage, marker='o', label='Average Memory Usage', color="lime")
    axs1[1, 1].plot(max_memory_usage, marker='x', label='Max Memory Usage', color="navy")
    axs1[1, 1].set_title('Memory Usage Over Test Runs')
    axs1[1, 1].set_xlabel('Test Runs')
    axs1[1, 1].set_ylabel('Memory Usage (%)')
    axs1[1, 1].legend()
    axs1[1, 1].grid(True)

    # Adjust layout and show all graphs
    plt.tight_layout()
    plt.show()

def main():
    results_dir = './perf_results'
    perf_data = load_perf_data(results_dir)
    
    # Generate all graphs in a single view
    generate_all_graphs(perf_data)

if __name__ == "__main__":
    main()