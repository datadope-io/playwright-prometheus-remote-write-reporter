// src/index.ts
import path from "node:path";
import { cpuUsage, memoryUsage, argv, versions } from "node:process";
import {
  arch,
  cpus,
  availableParallelism,
  machine,
  userInfo,
  platform,
  release,
  type,
  version,
  freemem
} from "node:os";
import { pushTimeseries } from "prometheus-remote-write";

// src/utils.ts
var Event = class _Event {
  constructor(payload, name = _Event.name) {
    this.payload = payload;
    this.name = name;
  }
  static name = "prometheus-remote-writer";
  /**
   * Retrurns `true` if incoming object is event.
   * False in other cases
   */
  static is(input) {
    if (typeof input === "object" && input !== null && "name" in input && "payload" in input && input.name === _Event.name && typeof input.payload === "object") {
      return true;
    }
    return false;
  }
};

// src/helpers.ts
var Metric = class {
  /** **NOTE:** Must be initialized in constructor */
  series;
  /** Internal method */
  _getSeries() {
    return this.series;
  }
  /** Append extra labels */
  labels(labels) {
    this.series.labels = {
      ...this.series.labels,
      ...labels
    };
    return this;
  }
  /** Send metrics to prometheus */
  collect() {
    const event = new Event(this.series);
    process.stdout.write(JSON.stringify(event));
    return this;
  }
};
var Counter = class _Counter extends Metric {
  constructor(metadata, initialValue = 0) {
    super();
    this.metadata = metadata;
    this.initialValue = initialValue;
    if (!metadata.name) {
      throw new Error(`"name" property for metadata is required`);
    }
    this.counter = initialValue;
    const { name, ...restMetadata } = this.metadata;
    this.series = {
      labels: {
        __name__: name,
        ...restMetadata
      },
      samples: [
        {
          value: this.counter,
          timestamp: Date.now()
        }
      ]
    };
  }
  counter = 0;
  /** Increase counter by selected value */
  inc(value = 1) {
    this.counter += value;
    this.series.samples.push({
      value: this.counter,
      timestamp: Date.now()
    });
    return this;
  }
  reset() {
    return new _Counter(this.metadata, this.initialValue);
  }
};
var Gauge = class _Gauge extends Counter {
  /** Decrement gauge value */
  dec(value = 1) {
    this.counter -= value;
    this.series.samples.push({
      value: this.counter,
      timestamp: Date.now()
    });
    return this;
  }
  /** set gauge value */
  set(value = 1) {
    this.counter = value;
    this.series.samples.push({
      value: this.counter,
      timestamp: Date.now()
    });
    return this;
  }
  /** set gauge to zero  */
  zero() {
    return this.set(0);
  }
  reset() {
    return new _Gauge(this.metadata, this.initialValue);
  }
};

// src/index.ts
import crypto from "node:crypto";
var DEFAULT_PREFIX = `pw_`;
var DEFAULT_WRITER_URL = "http://localhost:9090/api/v1/write";
var PrometheusReporter = class {
  options = {};
  prefix;
  env;
  pw_projects = [];
  pw_step_total_count = new Counter({
    name: "step_total_count"
  });
  pw_step_total_duration = new Gauge(
    {
      name: "test_step_total_duration",
      unit: "ms"
    },
    0
  );
  pw_test_annotations = new Counter(
    {
      name: "test_annotation"
    },
    0
  );
  pw_step = new Counter(
    {
      name: "test_step"
    },
    1
  );
  pw_step_duration = new Gauge({
    name: "step_duration"
  });
  pw_step_status = new Gauge({
    name: "step_status"
  });
  pw_stderr = new Counter({
    name: "stderr"
  });
  pw_stdout = new Counter({
    name: "stdout"
  });
  pw_config = new Counter(
    {
      name: "config"
    },
    1
  );
  test_attachment = new Counter(
    {
      name: "test_attachment"
    },
    0
  );
  test_attachment_size = new Gauge({
    name: "test_attachment_size",
    unit: "bytes"
  });
  tests_total_attachment_size = new Gauge({
    name: "tests_attachment_total_size",
    unit: "bytes"
  });
  errors_count = new Counter({
    name: "error_count"
  });
  test_errors = new Counter({
    name: "test_error"
  });
  tests_total_attachment = new Counter({
    name: "tests_attachment_total_count"
  });
  test_duration = new Gauge({
    name: "test_duration",
    unit: "ms"
  });
  test = new Counter({
    name: "test"
  });
  test_retry = new Counter({
    name: "test_retry_count"
  });
  total_duration = new Gauge({
    name: "tests_total_duration",
    unit: "ms"
  });
  test_total_count = new Counter({
    name: "tests_total_count"
  });
  skipped_tests_count = new Counter({
    name: "tests_skip_count"
  });
  passed_count = new Counter({
    name: "tests_pass_count"
  });
  failed_count = new Counter({
    name: "tests_fail_count"
  });
  // Node.js internals. Usefull to see memory leaks
  node_memory_heap_total = new Gauge({
    name: "node_memory_heap_total",
    unit: "bytes"
  });
  node_memory_rss = new Gauge({
    name: "node_memory_rss",
    unit: "bytes"
  });
  node_memory_heap_used = new Gauge({
    name: "node_memory_heap_used",
    unit: "bytes"
  });
  node_memory_external = new Gauge({
    name: "node_memory_external",
    unit: "bytes"
  });
  node_memory_free = new Gauge({
    name: "node_memory_free",
    unit: "bytes"
  });
  node_memory_array_buffers = new Gauge({
    name: "node_memory_array_buffers",
    unit: "bytes"
  });
  node_cpu_user = new Gauge({
    name: "node_cpu_user"
  });
  node_cpu_system = new Gauge({
    name: "node_cpu_system"
  });
  node_argv = new Counter(
    {
      name: "node_argv",
      ...Object.fromEntries(
        argv.map((value, index) => [index, value])
      )
    },
    1
  );
  node_os = new Counter(
    {
      name: "node_os",
      arch: arch(),
      cpusCount: String(cpus().length),
      availableParallelism: String(availableParallelism()),
      machine: machine(),
      username: userInfo().username,
      shell: userInfo().shell ?? "",
      uid: String(userInfo().uid),
      gid: String(userInfo().gid),
      homedir: userInfo().homedir,
      platform: platform(),
      release: release(),
      type: type(),
      version: version()
    },
    1
  );
  node_env;
  node_versions = new Counter(
    {
      name: "node_versions",
      ...versions
    },
    1
  );
  /** timeserties from user tests */
  timeseries = [];
  constructor(options = {}) {
    this.options.url = options?.serverUrl ?? DEFAULT_WRITER_URL;
    this.options.headers = options?.headers ?? {};
    this.options.fetch = fetch;
    this.prefix = options.prefix ?? DEFAULT_PREFIX;
    this.options.labels = options?.labels ?? {};
    this.options.auth = options?.auth;
    this.env = options?.env ?? process.env;
    this.node_env = new Counter(
      {
        name: "node_env",
        ...this.env
      },
      1
    );
  }
  memoryDelta;
  cpuDelta;
  updateNodejsStats() {
    this.cpuDelta = cpuUsage(this.cpuDelta);
    this.node_cpu_user.set(this.cpuDelta.user);
    this.node_cpu_system.set(this.cpuDelta.system);
    this.node_memory_free.set(freemem());
    this.memoryDelta = memoryUsage();
    this.node_memory_array_buffers.set(this.memoryDelta.arrayBuffers);
    this.node_memory_external.set(this.memoryDelta.external);
    this.node_memory_heap_total.set(this.memoryDelta.heapTotal);
    this.node_memory_heap_used.set(this.memoryDelta.heapUsed);
    this.node_memory_rss.set(this.memoryDelta.rss);
  }
  async sendNodejsStats() {
    const stats = [
      this.node_cpu_user._getSeries(),
      this.node_cpu_system._getSeries(),
      this.node_memory_array_buffers._getSeries(),
      this.node_memory_external._getSeries(),
      this.node_memory_heap_total._getSeries(),
      this.node_memory_heap_used._getSeries(),
      this.node_memory_rss._getSeries(),
      this.node_os._getSeries(),
      this.node_env._getSeries(),
      this.node_argv._getSeries(),
      this.node_versions._getSeries()
    ].map((s) => this.mapTimeseries(s));
    await this.send(stats);
  }
  async send(series) {
    await pushTimeseries(series, this.options);
  }
  onBegin(config, suite) {
    this.pw_config.labels({
      workers: String(config.workers),
      forbidOnly: String(config.forbidOnly),
      configFile: config.configFile ?? "",
      fullyParallel: String(config.fullyParallel),
      preserveOutput: config.preserveOutput,
      quiet: String(config.quiet),
      updateSnapshots: config.updateSnapshots,
      version: config.version,
      shard_current: String(config.shard?.current ?? 1),
      shard_total: String(config.shard?.total ?? 1)
    });
    this.pw_projects = config.projects.map((project) => {
      return new Counter(
        {
          name: "project",
          projectName: project.name,
          outputDir: project.outputDir,
          repeatEach: String(project.repeatEach),
          snapshotDir: project.snapshotDir,
          testDir: project.testDir,
          timeout: String(project.timeout),
          unit: "ms"
        },
        1
      );
    });
    this.updateNodejsStats();
  }
  updateResults(result) {
    if (result.status === "passed") {
      this.passed_count.inc();
    }
    if (result.status === "failed") {
      this.failed_count.inc();
    }
    if (result.status === "skipped") {
      this.skipped_tests_count.inc();
    }
    this.test_total_count.inc();
    this.total_duration.inc(result.duration);
  }
  async onStepEnd(test, result, step) {
    this.pw_step.labels({
      category: step.category,
      testId: test.id,
      testTitle: test.title,
      stepTitle: step.title
    });
    this.pw_step_total_duration.labels({
      testId: test.id,
      testTitle: test.title
    }).inc(step.duration);
    this.updateNodejsStats();
  }
  async onTestEnd(test, result) {
    this.updateResults(result);
    result.attachments.forEach((attach) => {
      const size = attach.body?.length ?? 0;
      this.tests_total_attachment_size.inc(size);
      const labels2 = {
        testId: test.id,
        testTitle: test.title,
        unit: "bytes"
      };
      this.test_attachment.labels({
        path: attach.path ?? "",
        size: String(size),
        contentType: attach.contentType,
        attachmentName: attach.name,
        body: attach.body ? Buffer.from(attach.body).toString("utf-8") : "",
        ...labels2
      }).inc();
      this.test_attachment_size.labels(labels2).inc(size);
      this.tests_total_attachment.inc();
    });
    test.annotations.forEach((annotation) => {
      this.pw_test_annotations.labels({
        type: annotation.type,
        description: annotation.description ?? "",
        testId: test.id,
        testTitle: test.title
      }).inc();
    });
    const labels = {
      title: test.title,
      id: test.id,
      suite: test.parent.title,
      location: this.location(test),
      expectedStatus: test.expectedStatus,
      actualStatus: result.status,
      duration: String(result.duration),
      parallelIndex: String(result.parallelIndex),
      attachmentsCount: String(result.attachments.length),
      stepsCount: String(result.steps.length),
      workerIndex: String(result.workerIndex),
      retryCount: String(result.retry)
    };
    this.pw_step_total_count.inc(result.steps.length);
    const testSeries = this.mapTimeseries(
      this.test.labels(labels).inc()._getSeries()
    );
    const testDuration = this.mapTimeseries(
      this.test_duration.labels(labels).set(result.duration)._getSeries()
    );
    const testRetries = this.mapTimeseries(
      this.test_retry.labels(labels).inc(result.retry)._getSeries()
    );
    await this.send([
      this.mapTimeseries(this.pw_step._getSeries()),
      this.mapTimeseries(this.pw_step_total_duration._getSeries()),
      this.mapTimeseries(this.test_attachment_size._getSeries()),
      this.mapTimeseries(this.pw_test_annotations._getSeries()),
      testSeries,
      testDuration,
      testRetries,
      this.mapTimeseries(this.test_attachment._getSeries())
    ]);
    for (const step of result.steps) {
      this.pw_step_duration.reset();
      this.pw_step_status.reset();
      const location = step.location ? `${path.relative(process.cwd(), step.location.file)}:${step.location.line}:${step.location.column}` : "unknown";
      const raw_id = `${step.title}:${step.category}:${location}`;
      const stepId = crypto.createHash("md5").update(raw_id).digest("hex");
      const labels2 = {
        stepId,
        testId: test.id,
        testTitle: test.title,
        stepTitle: step.title,
        category: step.category,
        location
      };
      const duration = step.duration ?? 0;
      this.pw_step_duration.labels(labels2).set(duration);
      const status = step.error ? 0 : 1;
      const statusLabels = {
        ...labels2,
        errorMessage: step.error?.message ? step.error.message.replace(/\r?\n|\r/g, " ") : ""
      };
      this.pw_step_status.labels(statusLabels).set(status);
      const durSeries = this.pw_step_duration._getSeries();
      durSeries.samples = durSeries.samples.slice(-1);
      const statusSeries = this.pw_step_status._getSeries();
      statusSeries.samples = statusSeries.samples.slice(-1);
      await this.send([
        this.mapTimeseries(durSeries),
        this.mapTimeseries(statusSeries)
      ]);
    }
    this.pw_step.reset();
    this.pw_test_annotations.reset();
    this.test = this.test.reset();
    this.test_duration = this.test_duration.reset();
    this.test_retry = this.test_retry.reset();
    this.pw_step_total_duration.reset();
    this.test_attachment_size.reset();
    this.pw_step_duration.reset();
    this.pw_step_status.reset();
    this.updateNodejsStats();
  }
  onError(error) {
    this.errors_count.labels({
      message: String(error.message ?? ""),
      snippet: String(error.snippet ?? ""),
      value: String(error.value ?? "")
    }).inc();
    this.test_errors.inc();
    this.updateNodejsStats();
  }
  mapTimeseries(series) {
    const { __name__, ...restLabels } = series.labels;
    const timeseries = {
      labels: {
        __name__: `${this.prefix}${__name__}`,
        ...restLabels
      },
      samples: series.samples
    };
    return timeseries;
  }
  async onStdOut(chunk, test, result) {
    const labels = {
      text: Buffer.from(chunk).toString("utf-8"),
      size: String(chunk.length),
      unit: "bytes",
      encoding: "utf8",
      testId: test?.id ?? "",
      testTitle: test?.title ?? ""
    };
    try {
      const event = JSON.parse(String(chunk));
      if (Event.is(event)) {
        const timeseries = this.mapTimeseries(event.payload);
        await this.send(timeseries);
        this.pw_stdout.labels({
          // playwright-prometheus-remote-write-reporter
          internal: "true",
          ...labels
        }).inc();
      }
    } catch (e) {
      this.pw_stdout.labels({
        // rest reporter
        internal: "false",
        ...labels
      }).inc();
    }
    this.updateNodejsStats();
  }
  onStdErr(chunk, test, result) {
    const labels = {
      text: Buffer.from(chunk).toString("utf-8"),
      size: String(chunk.length),
      unit: "bytes",
      encoding: "utf8",
      testId: test?.id ?? "",
      testTitle: test?.title ?? ""
    };
    try {
      const text = JSON.stringify(JSON.parse(labels.text));
      this.pw_stderr.labels({
        ...labels,
        json: "true",
        text
      }).inc();
    } catch (e) {
      this.pw_stderr.labels({
        ...labels
      }).inc();
    }
    this.updateNodejsStats();
  }
  onEnd(result) {
    this.updateNodejsStats();
  }
  onStepBegin(test, result, step) {
    this.updateNodejsStats();
  }
  onTestBegin(test, result) {
    this.updateNodejsStats();
  }
  async onExit() {
    await this.send([
      this.mapTimeseries(this.pw_config._getSeries()),
      this.mapTimeseries(this.pw_stdout._getSeries()),
      this.mapTimeseries(this.pw_stderr._getSeries()),
      this.mapTimeseries(this.failed_count._getSeries()),
      this.mapTimeseries(this.passed_count._getSeries()),
      this.mapTimeseries(this.skipped_tests_count._getSeries()),
      this.mapTimeseries(this.test_total_count._getSeries()),
      this.mapTimeseries(this.total_duration._getSeries()),
      this.mapTimeseries(this.tests_total_attachment._getSeries()),
      this.mapTimeseries(this.pw_step_total_count._getSeries()),
      this.mapTimeseries(this.tests_total_attachment_size._getSeries()),
      ...this.timeseries,
      ...this.pw_projects.map((p) => this.mapTimeseries(p._getSeries()))
    ]);
    this.updateNodejsStats();
    await this.sendNodejsStats();
  }
  location(test) {
    const relativePath = path.relative(process.cwd(), test.location.file);
    return `${relativePath}:${test.location.line}:${test.location.column}`;
  }
  printsToStdio() {
    return false;
  }
};
export {
  Counter,
  Gauge,
  PrometheusReporter as default
};
