import { Reporter, FullConfig, Suite, TestCase, TestResult, TestStep, TestError, FullResult } from '@playwright/test/reporter';
import { Timeseries } from 'prometheus-remote-write';

declare abstract class Metric {
    /** **NOTE:** Must be initialized in constructor */
    protected series: Timeseries;
    /** Internal method */
    _getSeries(): Timeseries;
    /** Append extra labels */
    labels(labels: Record<string, string>): this;
    /** Send metrics to prometheus */
    collect(): this;
    /** revert metric to initial state */
    abstract reset(): this;
}
/**
 * Counters go up, and reset when the process restarts.
 *
 * Initial value is 0
 */
declare class Counter extends Metric {
    readonly metadata: Record<"name" | (string & {}), string>;
    protected initialValue: number;
    protected counter: number;
    constructor(metadata: Record<"name" | (string & {}), string>, initialValue?: number);
    /** Increase counter by selected value */
    inc(value?: number): this;
    reset(): this;
}
declare class Gauge extends Counter {
    /** Decrement gauge value */
    dec(value?: number): this;
    /** set gauge value */
    set(value?: number): this;
    /** set gauge to zero  */
    zero(): this;
    reset(): this;
}

type PrometheusOptions = {
    /**
     * URL of the Prometheus remote write implementation's endpoint.
     * @default 'http://localhost:9090/api/v1/write' */
    serverUrl?: string;
    /**
     * Additional headers to include in the HTTP requests.
     * @example
     * { header1: 'key1' }
     */
    headers?: Record<string, string>;
    auth?: {
        /** Basic auth. Username */
        username?: string;
        /** Basic auth. Password */
        password?: string;
    };
    /** @default 'pw_' */
    prefix?: string;
    /**
     * Additional labels to apply to each timeseries.
     * @example
     * { instance: "hostname" }
     */
    labels?: Record<string, string>;
    /**
     * env variables to send.
     * @default `process.env`
     * @see {@link https://nodejs.org/docs/latest/api/process.html#processenv node.js - process.env}
     */
    env?: Record<string, string | undefined>;
};
declare class PrometheusReporter implements Reporter {
    private readonly options;
    private readonly prefix;
    private readonly env;
    private pw_projects;
    private readonly pw_step_total_count;
    private readonly pw_step_total_duration;
    private readonly pw_test_annotations;
    private readonly pw_step;
    private readonly pw_step_duration;
    private readonly pw_step_status;
    private readonly pw_stderr;
    private readonly pw_stdout;
    private readonly pw_config;
    private test_attachment;
    private test_attachment_size;
    private tests_total_attachment_size;
    private errors_count;
    private test_errors;
    private tests_total_attachment;
    private test_duration;
    private test;
    private test_retry;
    private total_duration;
    private readonly test_total_count;
    private readonly skipped_tests_count;
    private readonly passed_count;
    private readonly failed_count;
    private readonly node_memory_heap_total;
    private readonly node_memory_rss;
    private readonly node_memory_heap_used;
    private readonly node_memory_external;
    private readonly node_memory_free;
    private readonly node_memory_array_buffers;
    private readonly node_cpu_user;
    private readonly node_cpu_system;
    private readonly node_argv;
    private readonly node_os;
    private readonly node_env;
    private readonly node_versions;
    /** timeserties from user tests */
    private readonly timeseries;
    constructor(options?: PrometheusOptions);
    private memoryDelta;
    private cpuDelta;
    private updateNodejsStats;
    private sendNodejsStats;
    private send;
    onBegin(config: FullConfig, suite: Suite): void;
    private updateResults;
    onStepEnd(test: TestCase, result: TestResult, step: TestStep): Promise<void>;
    onTestEnd(test: TestCase, result: TestResult): Promise<void>;
    onError(error: TestError): void;
    private mapTimeseries;
    onStdOut(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): Promise<void>;
    onStdErr(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void;
    onEnd(result: FullResult): void;
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void;
    onTestBegin(test: TestCase, result: TestResult): void;
    onExit(): Promise<void>;
    private location;
    printsToStdio(): boolean;
}

export { Counter, Gauge, type PrometheusOptions, PrometheusReporter as default };
