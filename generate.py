import os
import json
import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import make_interp_spline

padding = 5.0

def load_perf_data(results_dir):
    data = []
    filecount = 0

    for file_name in os.listdir(results_dir):
        if file_name.endswith('.json'):
            with open(os.path.join(results_dir, file_name)) as f:
                data.append(json.load(f))
                filecount += 1
    return data, filecount

def plot_metrics(data):
    avg_latency = [entry['insights']['percentiles']['latency']['average'] for entry in data]
    max_latency = [entry['insights']['percentiles']['latency']['max'] for entry in data]
    min_latency = [entry['insights']['percentiles']['latency']['min'] for entry in data]
    avg_requests = [entry['insights']['percentiles']['requests']['average'] for entry in data]
    max_requests = [entry['insights']['percentiles']['requests']['max'] for entry in data]
    min_requests = [entry['insights']['percentiles']['requests']['min'] for entry in data]
    avg_throughput = [round(entry['insights']['percentiles']['throughput']['average'] / (1024 * 1024), 2) for entry in data]
    max_throughput = [round(entry['insights']['percentiles']['throughput']['max'] / (1024 * 1024), 2) for entry in data]
    min_throughput = [round(entry['insights']['percentiles']['throughput']['min'] / (1024 * 1024), 2) for entry in data]
    error_rates = [(entry['insights']['failureCases']['errors'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]
    non2xx_rates = [(entry['insights']['failureCases']['non2xx'] / int(entry['insights']['totalRequests'].split()[0])) * 100 for entry in data]
    
    #Printing all the mean values
    print("\nLatency : ")
    print(f"Avg : {round(np.mean(avg_latency),2)} ms")
    print(f"Max : {max(max_latency)} ms")
    print(f"Min : {min(min_latency)} ms")
    
    print("\nRequests Handled: ")
    print(f"Avg : {round(np.mean(avg_requests),2)} Req/Sec")
    print(f"Max : {max(max_requests)} Req/Sec")
    print(f"Min : {min(min_requests)} Req/Sec")

    print("\nThroughput: ")
    print(f"Avg : {round(np.mean(avg_throughput),2)} MB/sec")
    print(f"Max : {max(max_throughput)} MB/sec")
    print(f"Min : {min(min_throughput)} MB/sec")

    print("\nError Rate: ")
    print(f"Avg : {round(np.mean(error_rates),2)} %")
    print(f"Avg Non-2xx : {round(np.mean(non2xx_rates),2)} %")


    fig, axs = plt.subplots(2, 2, figsize=(18, 18))

    # Plot Average Latency
    axs[0, 0].plot(avg_latency, marker='o', label='Average Latency', color="red")
    axs[0, 0].plot(max_latency, marker='x', label='Max Latency', color="orange")
    axs[0, 0].plot(min_latency, marker='|', label='Min Latency', color="blue")
    axs[0, 0].set_ylim(-10, max(max_latency)*1.5)
    axs[0, 0].set_title('Response Times (Latency)')
    axs[0, 0].set_xlabel('Test Run(s)')
    axs[0, 0].set_ylabel('Latency (ms)')
    axs[0, 0].legend()
    axs[0, 0].grid(True)

    # Plot Requests per Second
    axs[0, 1].plot(avg_requests, marker='o', label='Average Requests per Second', color="red")
    axs[0, 1].plot(max_requests, marker='x', label='Max Requests per Second', color="orange")
    axs[0, 1].plot(min_requests, marker='|', label='Min Requests per Second', color="blue")
    axs[0, 1].set_ylim(0, max_requests[0]*1.5)
    axs[0, 1].set_title('Requests per Second')
    axs[0, 1].set_xlabel('Test Run(s)')
    axs[0, 1].set_ylabel('Requests per Second')
    axs[0, 1].legend()
    axs[0, 1].grid(True)

    # Plot Throughput
    axs[1, 0].plot(avg_throughput, marker='o', label='Average Throughput')
    axs[1, 0].plot(max_throughput, marker='x', label='Max Throughput')
    axs[1, 0].set_ylim(0, max_throughput[0]*1.5)
    axs[1, 0].set_title('Throughput')
    axs[1, 0].set_xlabel('Test Run(s)')
    axs[1, 0].set_ylabel('Throughput (MB/sec)')
    axs[1, 0].legend()
    axs[1, 0].grid(True)

    # Plot Error Rates
    axs[1, 1].plot(error_rates, marker='o')
    axs[1, 1].plot(non2xx_rates, marker='x')
    axs[1, 1].set_title('Error Rates')
    axs[1, 1].set_xlabel('Test Run(s)')
    axs[1, 1].set_ylabel('Error Rate (%)')
    axs[1, 1].grid(True)

    plt.tight_layout(pad=padding)
    plt.show()

def plot_combined_graphs(data):
    # Extract data
    test_runs = range(1, len(data) + 1)  # Use test run numbers as x-axis
    number_of_messages_sent = [entry['insights'].get('numberOfMessagesSent', 0) for entry in data]
    number_of_files_sent = [entry['insights'].get('numberOfFilesSent', 0) for entry in data]
    
    #Printing all the mean values
    print("\nAvg Sent: ")
    print(f"# of Messages : {round(np.mean(number_of_messages_sent),2)} per test run")
    print(f"# of Files : {round(np.mean(number_of_files_sent),2)} per test run")

    # Create a single figure with subplots 
    fig, axs = plt.subplots(2, 1, figsize=(18, 18))

    # Plot Number of Messages Sent Over Test Runs
    x = np.array(list(test_runs))
    y = np.array(number_of_messages_sent)
    x_smooth = np.linspace(x.min(), x.max(), 300)
    y_smooth = make_interp_spline(x, y)(x_smooth)
    axs[0].plot(x, y, label="Number of Messages Sent", color="red", marker="o")
    axs[0].plot(x_smooth, y_smooth, label="Number of Messages Sent (Smooth Curve)", color="blue")
    axs[0].set_ylim(min(number_of_messages_sent)/1.5, max(number_of_messages_sent) * 1.5)
    axs[0].set_title("Number of Messages Sent Over Test Runs")
    axs[0].set_xlabel("Test Runs")
    axs[0].set_ylabel("Number of Messages Sent")
    axs[0].legend()
    axs[0].grid(True)

    # Plot Number of Files Sent for Each Test Run
    x1 = np.array(list(test_runs))
    y1 = np.array(number_of_files_sent)
    x_smooth1 = np.linspace(x1.min(), x1.max(), 300)
    y_smooth1 = make_interp_spline(x1, y1)(x_smooth1)
    axs[1].plot(x1, y1, marker="o", label="Number of Files Sent", color="green")
    axs[1].plot(x_smooth1, y_smooth1, label="Number of Files Sent (Smooth Curve)", color="cyan")
    axs[1].set_ylim(0, max(number_of_files_sent) * 1.5)
    axs[1].set_title("Number of Files Sent Over Test Runs")
    axs[1].set_xlabel("Test Runs")
    axs[1].set_ylabel("Number of Files Sent")
    axs[1].legend()
    axs[1].grid(True)

    plt.tight_layout(pad=padding)
    plt.show()

def plot_cpu_memory_usage(data):
    avg_cpu_usage = [float(entry['insights']['averageCpuUsage'].replace('%', '')) for entry in data]
    max_cpu_usage = [float(entry['insights']['maxCpuUsage'].replace('%', '')) for entry in data]
    avg_memory_usage = [float(entry['insights']['averageMemoryUsage'].replace('%', '')) for entry in data]
    max_memory_usage = [float(entry['insights']['maxMemoryUsage'].replace('%', '')) for entry in data]

    #Printing all the mean values
    print("\nAvg Utilization: ")
    print(f"CPU : {round(np.mean(avg_cpu_usage),2)} %")
    print(f"Memory : {round(np.mean(avg_memory_usage),2)} %")

    fig, axs = plt.subplots(2, 2, figsize=(18, 18))

    # Plot CPU Usage
    axs[0,0].plot(avg_cpu_usage, marker='o', label='Average CPU Usage')
    axs[0,0].plot(max_cpu_usage, marker='x', label='Max CPU Usage')
    axs[0,0].set_ylim(min(max_cpu_usage)/1.2, max(max_cpu_usage)*1.2)
    axs[0,0].set_title('CPU Usage')
    axs[0,0].set_xlabel('Test Run(s)')
    axs[0,0].set_ylabel('CPU Usage (%)')
    axs[0,0].legend()
    axs[0,0].grid(True)

    # Plot Memory Usage
    axs[0,1].plot(avg_memory_usage, marker='o', label='Average Memory Usage')
    axs[0,1].plot(max_memory_usage, marker='x', label='Max Memory Usage')
    axs[0,1].set_ylim(0, max_memory_usage[0]*1.5)
    axs[0,1].set_title('Memory Usage')
    axs[0,1].set_xlabel('Test Run(s)')
    axs[0,1].set_ylabel('Memory Usage (%)')
    axs[0,1].legend()
    axs[0,1].grid(True)

    #BoxPlot of Max Requests per Second
    max_requests = [entry['insights']['percentiles']['requests']['max'] for entry in data]
    axs[1,0].boxplot(max_requests, vert=False)
    axs[1,0].set_xlabel('Requests per Second')
    axs[1,0].set_title('Boxplot of Max Requests per Second')

    # Plot Difference Between Messages and Files Sent for Each Test Run
    # axs[2].plot(test_runs, difference_in_messages_and_files, marker="o", label="Difference in Messages and Files", color="orange")
    # axs[2].set_title("Difference Between Messages and Files Sent")
    # axs[2].set_xlabel("Test Runs")
    # axs[2].set_ylabel("Difference in Counts")
    # axs[2].legend()
    # axs[2].grid(True)
    
    plt.tight_layout(pad=padding)
    plt.show()

def main():
    results_dir = './perf_results'
    perf_data, fileCount = load_perf_data(results_dir)
    print("----------------------Test Insights----------------------")
    print(f"\nNumber of Tests Performed: {fileCount}")
    plot_metrics(perf_data)
    plot_cpu_memory_usage(perf_data)
    plot_combined_graphs(perf_data)

if __name__ == "__main__":
    main() 