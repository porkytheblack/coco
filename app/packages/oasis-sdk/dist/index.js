// src/client.ts
var DEFAULT_TIMEOUT = 1e4;
var OasisClient = class {
  config;
  appSlug;
  constructor(config) {
    this.config = config;
    this.appSlug = this.extractAppSlug(config.apiKey);
  }
  /**
   * Extract the app slug from the API key.
   *
   * @param apiKey - The public API key (format: pk_app-slug_randomchars)
   * @returns The app slug
   */
  extractAppSlug(apiKey) {
    const parts = apiKey.split("_");
    if (parts.length < 3 || parts[0] !== "pk") {
      throw new Error("Invalid API key format. Expected: pk_app-slug_randomchars");
    }
    const lastUnderscoreIndex = apiKey.lastIndexOf("_");
    const slugStart = 3;
    const slug = apiKey.slice(slugStart, lastUnderscoreIndex);
    return slug;
  }
  /**
   * Send a feedback event to the server.
   *
   * @param event - The feedback event
   * @returns The server response
   */
  async sendFeedback(event) {
    const url = `${this.config.serverUrl}/sdk/${this.appSlug}/feedback`;
    const body = {
      category: event.category,
      message: event.message,
      email: event.email,
      appVersion: event.appVersion,
      platform: event.platform,
      osVersion: event.osVersion,
      deviceInfo: event.deviceInfo
    };
    const response = await this.request(url, body);
    return response;
  }
  /**
   * Send a crash report to the server.
   *
   * @param event - The crash event
   * @returns The server response
   */
  async sendCrash(event) {
    const url = `${this.config.serverUrl}/sdk/${this.appSlug}/crashes`;
    const body = {
      errorType: event.errorType,
      errorMessage: event.errorMessage,
      stackTrace: event.stackTrace,
      appVersion: event.appVersion,
      platform: event.platform,
      osVersion: event.osVersion,
      deviceInfo: event.deviceInfo,
      appState: event.appState,
      breadcrumbs: event.breadcrumbs,
      severity: event.severity,
      userId: event.userId
    };
    const response = await this.request(url, body);
    return response;
  }
  /**
   * Make an HTTP request to the Oasis server.
   *
   * @param url - Request URL
   * @param body - Request body
   * @returns Parsed response data
   */
  async request(url, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? DEFAULT_TIMEOUT);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const data = await response.json();
      if (!data.success) {
        throw new OasisApiError(
          data.error.message,
          data.error.code,
          response.status
        );
      }
      return data.data;
    } catch (error) {
      if (error instanceof OasisApiError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new OasisApiError("Request timeout", "TIMEOUT", 0);
        }
        throw new OasisApiError(error.message, "NETWORK_ERROR", 0);
      }
      throw new OasisApiError("Unknown error", "UNKNOWN_ERROR", 0);
    } finally {
      clearTimeout(timeout);
    }
  }
  /**
   * Get the app slug.
   */
  getAppSlug() {
    return this.appSlug;
  }
};
var OasisApiError = class extends Error {
  code;
  statusCode;
  constructor(message, code, statusCode) {
    super(message);
    this.name = "OasisApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
};

// src/device.ts
function detectPlatform() {
  if (typeof window !== "undefined" && "__TAURI__" in window) {
  }
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    const platformStr = (navigator.platform ?? "").toLowerCase();
    let os = "unknown";
    if (ua.includes("mac") || platformStr.includes("mac")) {
      os = "darwin";
    } else if (ua.includes("win") || platformStr.includes("win")) {
      os = "windows";
    } else if (ua.includes("linux") || platformStr.includes("linux")) {
      os = "linux";
    }
    let arch = "x86_64";
    if (ua.includes("arm64") || ua.includes("aarch64")) {
      arch = "aarch64";
    } else if (ua.includes("arm")) {
      arch = "armv7";
    }
    return `${os}-${arch}`;
  }
  if (typeof process !== "undefined" && process?.platform) {
    const os = process.platform === "darwin" ? "darwin" : process.platform === "win32" ? "windows" : process.platform === "linux" ? "linux" : "unknown";
    const arch = process.arch === "arm64" ? "aarch64" : process.arch === "arm" ? "armv7" : process.arch === "x64" ? "x86_64" : "x86_64";
    return `${os}-${arch}`;
  }
  return "unknown-unknown";
}
function detectOsVersion() {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    const macMatch = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (macMatch) {
      return `macOS ${macMatch[1].replace(/_/g, ".")}`;
    }
    const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
    if (winMatch) {
      const version = winMatch[1];
      const versionMap = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7"
      };
      return `Windows ${versionMap[version] ?? version}`;
    }
    if (ua.includes("Linux")) {
      return "Linux";
    }
  }
  return void 0;
}
function collectDeviceInfo() {
  const info = {};
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    if (typeof screen !== "undefined") {
      info.screenWidth = screen.width;
      info.screenHeight = screen.height;
      info.pixelRatio = window.devicePixelRatio;
    }
    info.userAgent = navigator.userAgent;
    info.locale = navigator.language;
    try {
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
    }
    if (navigator.hardwareConcurrency) {
      info.cpuCores = navigator.hardwareConcurrency;
    }
    const nav = navigator;
    if (nav.deviceMemory) {
      info.memoryTotal = nav.deviceMemory * 1024 * 1024 * 1024;
    }
  }
  return info;
}

// src/feedback.ts
var FeedbackManager = class {
  config;
  client;
  queue;
  constructor(config, client, queue) {
    this.config = config;
    this.client = client;
    this.queue = queue;
  }
  /**
   * Submit user feedback to Oasis.
   *
   * @param options - Feedback options
   *
   * @example
   * ```typescript
   * await oasis.feedback.submit({
   *   category: "bug",
   *   message: "The save button doesn't work",
   *   email: "user@example.com"
   * });
   * ```
   */
  async submit(options) {
    const event = this.createFeedbackEvent(options);
    await this.sendOrQueue(event);
  }
  /**
   * Submit a bug report.
   *
   * @param message - Bug description
   * @param email - Optional contact email
   */
  async reportBug(message, email) {
    await this.submit({ category: "bug", message, email });
  }
  /**
   * Submit a feature request.
   *
   * @param message - Feature description
   * @param email - Optional contact email
   */
  async requestFeature(message, email) {
    await this.submit({ category: "feature", message, email });
  }
  /**
   * Submit general feedback.
   *
   * @param message - Feedback message
   * @param email - Optional contact email
   */
  async sendFeedback(message, email) {
    await this.submit({ category: "general", message, email });
  }
  /**
   * Create a feedback event from options.
   */
  createFeedbackEvent(options) {
    const deviceInfo = collectDeviceInfo();
    const platform = detectPlatform();
    const osVersion = detectOsVersion();
    return {
      type: "feedback",
      category: options.category,
      message: options.message,
      email: options.email,
      appVersion: this.config.appVersion,
      platform,
      osVersion,
      deviceInfo,
      metadata: options.metadata,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Send event or queue it for later if offline/failed.
   */
  async sendOrQueue(event) {
    if (this.config.beforeSend) {
      const modified = this.config.beforeSend(event);
      if (!modified) {
        if (this.config.debug) {
          console.log("[Oasis] Feedback event filtered by beforeSend");
        }
        return;
      }
      Object.assign(event, modified);
    }
    try {
      await this.client.sendFeedback(event);
      if (this.config.debug) {
        console.log("[Oasis] Feedback sent successfully");
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Oasis] Failed to send feedback, queueing:", error);
      }
      this.queue.enqueue(event);
      if (this.config.onError && error instanceof Error) {
        this.config.onError(error, event);
      }
    }
  }
};

// src/crashes.ts
function parseStackTrace(stack) {
  if (!stack) {
    return [];
  }
  const frames = [];
  const lines = stack.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) {
      continue;
    }
    const frame = parseStackFrame(trimmed);
    if (frame) {
      frames.push(frame);
    }
  }
  return frames;
}
function parseStackFrame(line) {
  const content = line.slice(3);
  if (content.includes("[native code]") || content.includes("<native>")) {
    return { isNative: true };
  }
  const matchWithParen = content.match(/^(.+?)\s*\((.+?):(\d+):(\d+)\)$/);
  if (matchWithParen) {
    return {
      function: matchWithParen[1],
      file: matchWithParen[2],
      line: parseInt(matchWithParen[3], 10),
      column: parseInt(matchWithParen[4], 10)
    };
  }
  const matchWithParenNoCol = content.match(/^(.+?)\s*\((.+?):(\d+)\)$/);
  if (matchWithParenNoCol) {
    return {
      function: matchWithParenNoCol[1],
      file: matchWithParenNoCol[2],
      line: parseInt(matchWithParenNoCol[3], 10)
    };
  }
  const matchNoFn = content.match(/^(.+?):(\d+):(\d+)$/);
  if (matchNoFn) {
    return {
      file: matchNoFn[1],
      line: parseInt(matchNoFn[2], 10),
      column: parseInt(matchNoFn[3], 10)
    };
  }
  const matchNoFnNoCol = content.match(/^(.+?):(\d+)$/);
  if (matchNoFnNoCol) {
    return {
      file: matchNoFnNoCol[1],
      line: parseInt(matchNoFnNoCol[2], 10)
    };
  }
  if (content && !content.includes(":")) {
    return { function: content };
  }
  return null;
}
var CrashReporter = class {
  config;
  client;
  breadcrumbs;
  queue;
  user = null;
  globalCleanup = null;
  constructor(config, client, breadcrumbs, queue) {
    this.config = config;
    this.client = client;
    this.breadcrumbs = breadcrumbs;
    this.queue = queue;
  }
  /**
   * Report a crash/error to Oasis.
   *
   * @param options - Crash report options
   */
  async report(options) {
    const event = this.createCrashEvent(options.error, options);
    await this.sendOrQueue(event);
  }
  /**
   * Capture an exception and report it.
   * Useful for try/catch blocks.
   *
   * @param error - The error to capture
   * @param options - Additional options
   */
  async captureException(error, options) {
    const errorObj = this.normalizeError(error);
    const event = this.createCrashEvent(errorObj, options);
    await this.sendOrQueue(event);
  }
  /**
   * Set the current user for crash attribution.
   *
   * @param user - User information
   */
  setUser(user) {
    this.user = user;
  }
  /**
   * Enable automatic crash reporting for uncaught errors.
   */
  enableAutoCrashReporting() {
    if (typeof window === "undefined") {
      return;
    }
    if (this.globalCleanup) {
      return;
    }
    const errorHandler = (event) => {
      const error = event.error ?? new Error(event.message);
      this.captureException(error, { severity: "fatal" });
    };
    const rejectionHandler = (event) => {
      const error = this.normalizeError(event.reason);
      this.captureException(error, { severity: "error" });
    };
    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    this.globalCleanup = () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }
  /**
   * Disable automatic crash reporting.
   */
  disableAutoCrashReporting() {
    if (this.globalCleanup) {
      this.globalCleanup();
      this.globalCleanup = null;
    }
  }
  /**
   * Create a crash event from an error.
   */
  createCrashEvent(error, options) {
    const stackTrace = parseStackTrace(error.stack);
    const deviceInfo = collectDeviceInfo();
    const platform = detectPlatform();
    const osVersion = detectOsVersion();
    return {
      type: "crash",
      errorType: error.name || "Error",
      errorMessage: error.message || "Unknown error",
      stackTrace,
      appVersion: this.config.appVersion,
      platform,
      osVersion,
      deviceInfo,
      appState: options?.appState,
      breadcrumbs: this.breadcrumbs.getAll(),
      severity: options?.severity ?? "error",
      userId: this.user?.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Normalize any value to an Error object.
   */
  normalizeError(error) {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === "string") {
      return new Error(error);
    }
    if (typeof error === "object" && error !== null) {
      const message = error.message;
      if (typeof message === "string") {
        const err = new Error(message);
        const name = error.name;
        if (typeof name === "string") {
          err.name = name;
        }
        return err;
      }
    }
    return new Error(String(error));
  }
  /**
   * Send event or queue it for later if offline/failed.
   */
  async sendOrQueue(event) {
    if (this.config.beforeSend) {
      const modified = this.config.beforeSend(event);
      if (!modified) {
        if (this.config.debug) {
          console.log("[Oasis] Crash event filtered by beforeSend");
        }
        return;
      }
      Object.assign(event, modified);
    }
    try {
      await this.client.sendCrash(event);
      if (this.config.debug) {
        console.log("[Oasis] Crash report sent successfully");
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Oasis] Failed to send crash report, queueing:", error);
      }
      this.queue.enqueue(event);
      if (this.config.onError && error instanceof Error) {
        this.config.onError(error, event);
      }
    }
  }
};

// src/breadcrumbs.ts
var BreadcrumbManager = class {
  breadcrumbs = [];
  maxBreadcrumbs;
  constructor(maxBreadcrumbs = 50) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }
  /**
   * Add a breadcrumb to the trail.
   *
   * @param breadcrumb - The breadcrumb to add
   */
  add(breadcrumb) {
    const crumb = {
      ...breadcrumb,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.breadcrumbs.push(crumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }
  /**
   * Add a navigation breadcrumb.
   *
   * @param from - Previous location/route
   * @param to - New location/route
   */
  addNavigation(from, to) {
    this.add({
      type: "navigation",
      message: `Navigated from ${from} to ${to}`,
      data: { from, to }
    });
  }
  /**
   * Add a click breadcrumb.
   *
   * @param target - Description of the clicked element
   * @param data - Additional click data
   */
  addClick(target, data) {
    this.add({
      type: "click",
      message: `Clicked on ${target}`,
      data
    });
  }
  /**
   * Add an HTTP request breadcrumb.
   *
   * @param method - HTTP method
   * @param url - Request URL
   * @param statusCode - Response status code (if available)
   */
  addHttp(method, url, statusCode) {
    this.add({
      type: "http",
      message: `${method} ${url}${statusCode ? ` [${statusCode}]` : ""}`,
      data: { method, url, statusCode }
    });
  }
  /**
   * Add a console breadcrumb.
   *
   * @param level - Console level (log, warn, error)
   * @param message - Console message
   */
  addConsole(level, message) {
    this.add({
      type: "console",
      message: `[${level.toUpperCase()}] ${message}`,
      data: { level }
    });
  }
  /**
   * Add a user action breadcrumb.
   *
   * @param action - Action description
   * @param data - Additional action data
   */
  addUserAction(action, data) {
    this.add({
      type: "user",
      message: action,
      data
    });
  }
  /**
   * Add a custom breadcrumb.
   *
   * @param type - Breadcrumb type
   * @param message - Breadcrumb message
   * @param data - Additional data
   */
  addCustom(type, message, data) {
    this.add({ type, message, data });
  }
  /**
   * Get all breadcrumbs.
   *
   * @returns Array of breadcrumbs
   */
  getAll() {
    return [...this.breadcrumbs];
  }
  /**
   * Clear all breadcrumbs.
   */
  clear() {
    this.breadcrumbs = [];
  }
  /**
   * Set the maximum number of breadcrumbs to keep.
   *
   * @param max - Maximum breadcrumb count
   */
  setMaxBreadcrumbs(max) {
    this.maxBreadcrumbs = max;
    if (this.breadcrumbs.length > max) {
      this.breadcrumbs = this.breadcrumbs.slice(-max);
    }
  }
};
function setupAutoBreadcrumbs(manager) {
  const cleanupFns = [];
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const clickHandler = (event) => {
    const target = event.target;
    if (target) {
      const description = getElementDescription(target);
      manager.addClick(description, {
        tagName: target.tagName,
        id: target.id || void 0,
        className: target.className || void 0
      });
    }
  };
  window.addEventListener("click", clickHandler, true);
  cleanupFns.push(() => window.removeEventListener("click", clickHandler, true));
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function(...args) {
    const from = window.location.href;
    originalPushState.apply(this, args);
    const to = window.location.href;
    if (from !== to) {
      manager.addNavigation(from, to);
    }
  };
  history.replaceState = function(...args) {
    const from = window.location.href;
    originalReplaceState.apply(this, args);
    const to = window.location.href;
    if (from !== to) {
      manager.addNavigation(from, to);
    }
  };
  const popstateHandler = () => {
    manager.add({
      type: "navigation",
      message: `Navigated to ${window.location.href}`,
      data: { url: window.location.href }
    });
  };
  window.addEventListener("popstate", popstateHandler);
  cleanupFns.push(() => window.removeEventListener("popstate", popstateHandler));
  cleanupFns.push(() => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  });
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  console.log = function(...args) {
    manager.addConsole("log", args.map(String).join(" "));
    originalConsole.log.apply(console, args);
  };
  console.warn = function(...args) {
    manager.addConsole("warn", args.map(String).join(" "));
    originalConsole.warn.apply(console, args);
  };
  console.error = function(...args) {
    manager.addConsole("error", args.map(String).join(" "));
    originalConsole.error.apply(console, args);
  };
  cleanupFns.push(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    try {
      const response = await originalFetch.apply(this, [input, init]);
      manager.addHttp(method, url, response.status);
      return response;
    } catch (error) {
      manager.addHttp(method, url);
      throw error;
    }
  };
  cleanupFns.push(() => {
    window.fetch = originalFetch;
  });
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}
function getElementDescription(element) {
  const tagName = element.tagName.toLowerCase();
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    return ariaLabel;
  }
  if (tagName === "button" || tagName === "a") {
    const text = element.textContent?.trim().slice(0, 50);
    if (text) {
      return `${tagName}: "${text}"`;
    }
  }
  if (tagName === "input") {
    const placeholder = element.placeholder;
    if (placeholder) {
      return `input: "${placeholder}"`;
    }
    const type = element.type;
    return `input[type="${type}"]`;
  }
  if (element.id) {
    return `${tagName}#${element.id}`;
  }
  if (element.className) {
    const classes = element.className.split(" ").slice(0, 2).join(".");
    return `${tagName}.${classes}`;
  }
  return tagName;
}

// src/queue.ts
var STORAGE_KEY = "oasis_event_queue";
var MAX_QUEUE_SIZE = 100;
var MAX_RETRY_ATTEMPTS = 3;
var EventQueue = class {
  queue = [];
  processing = false;
  sendFn = null;
  constructor() {
    this.loadFromStorage();
  }
  /**
   * Set the function used to send events.
   *
   * @param fn - The send function
   */
  setSendFunction(fn) {
    this.sendFn = fn;
  }
  /**
   * Add an event to the queue.
   *
   * @param event - The event to queue
   */
  enqueue(event) {
    const queuedEvent = {
      id: this.generateId(),
      event,
      attempts: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.queue.push(queuedEvent);
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE);
    }
    this.saveToStorage();
    this.processQueue();
  }
  /**
   * Process the queue, attempting to send events.
   */
  async processQueue() {
    if (this.processing || !this.sendFn || this.queue.length === 0) {
      return;
    }
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const queuedEvent = this.queue[0];
        if (!queuedEvent) break;
        try {
          await this.sendFn(queuedEvent.event);
          this.queue.shift();
          this.saveToStorage();
        } catch (error) {
          queuedEvent.attempts++;
          queuedEvent.lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
          if (queuedEvent.attempts >= MAX_RETRY_ATTEMPTS) {
            this.queue.shift();
          }
          this.saveToStorage();
          break;
        }
      }
    } finally {
      this.processing = false;
    }
  }
  /**
   * Get the current queue size.
   *
   * @returns Number of events in the queue
   */
  size() {
    return this.queue.length;
  }
  /**
   * Clear the queue.
   */
  clear() {
    this.queue = [];
    this.saveToStorage();
  }
  /**
   * Load queue from localStorage.
   */
  loadFromStorage() {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch {
      this.queue = [];
    }
  }
  /**
   * Save queue to localStorage.
   */
  saveToStorage() {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
    }
  }
  /**
   * Generate a unique ID for a queued event.
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
};
function setupQueueListeners(queue) {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const onOnline = () => {
    queue.processQueue();
  };
  window.addEventListener("online", onOnline);
  return () => {
    window.removeEventListener("online", onOnline);
  };
}

// src/index.ts
function validateConfig(config) {
  if (!config.apiKey) {
    throw new Error("Oasis SDK: apiKey is required");
  }
  if (!config.apiKey.startsWith("pk_")) {
    throw new Error("Oasis SDK: apiKey must be a public key (starting with pk_)");
  }
  if (!config.serverUrl) {
    throw new Error("Oasis SDK: serverUrl is required");
  }
  if (!config.appVersion) {
    throw new Error("Oasis SDK: appVersion is required");
  }
  if (!/^\d+\.\d+\.\d+/.test(config.appVersion)) {
    throw new Error("Oasis SDK: appVersion must be a valid semver (e.g., 1.2.3)");
  }
}
function initOasis(config) {
  validateConfig(config);
  const fullConfig = {
    maxBreadcrumbs: 50,
    timeout: 1e4,
    enableAutoCrashReporting: false,
    debug: false,
    ...config
  };
  const client = new OasisClient(fullConfig);
  const breadcrumbs = new BreadcrumbManager(fullConfig.maxBreadcrumbs);
  const queue = new EventQueue();
  const feedback = new FeedbackManager(fullConfig, client, queue);
  const crashes = new CrashReporter(fullConfig, client, breadcrumbs, queue);
  queue.setSendFunction(async (event) => {
    if (event.type === "feedback") {
      await client.sendFeedback(event);
    } else {
      await client.sendCrash(event);
    }
  });
  const cleanupFns = [];
  const breadcrumbCleanup = setupAutoBreadcrumbs(breadcrumbs);
  cleanupFns.push(breadcrumbCleanup);
  const queueCleanup = setupQueueListeners(queue);
  cleanupFns.push(queueCleanup);
  if (fullConfig.enableAutoCrashReporting) {
    crashes.enableAutoCrashReporting();
  }
  if (fullConfig.debug) {
    console.log("[Oasis] SDK initialized for app:", client.getAppSlug());
  }
  const instance = {
    feedback,
    crashes,
    breadcrumbs,
    setUser(user) {
      crashes.setUser(user);
    },
    getConfig() {
      return Object.freeze({ ...fullConfig });
    },
    async flush() {
      await queue.processQueue();
    },
    destroy() {
      crashes.disableAutoCrashReporting();
      cleanupFns.forEach((fn) => fn());
      queue.clear();
      if (fullConfig.debug) {
        console.log("[Oasis] SDK destroyed");
      }
    }
  };
  return instance;
}
var index_default = initOasis;
export {
  index_default as default,
  initOasis
};
