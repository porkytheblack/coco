/**
 * @oasis/sdk - Type Definitions
 */
/**
 * SDK initialization options
 */
interface OasisConfig {
    /** Public API key (format: pk_app-slug_randomchars) */
    apiKey: string;
    /** Oasis server URL (e.g., "https://updates.myapp.com") */
    serverUrl: string;
    /** Current app version (semver, e.g., "1.2.3") */
    appVersion: string;
    /** Enable automatic crash reporting for uncaught errors */
    enableAutoCrashReporting?: boolean;
    /** Maximum number of breadcrumbs to keep (default: 50) */
    maxBreadcrumbs?: number;
    /** Hook to modify or filter events before sending */
    beforeSend?: (event: FeedbackEvent | CrashEvent) => FeedbackEvent | CrashEvent | null;
    /** Called when an event fails to send */
    onError?: (error: Error, event: FeedbackEvent | CrashEvent) => void;
    /** Timeout for API requests in milliseconds (default: 10000) */
    timeout?: number;
    /** Enable debug logging */
    debug?: boolean;
}
/** Feedback category types */
type FeedbackCategory = "bug" | "feature" | "general";
/**
 * Options for submitting feedback
 */
interface FeedbackOptions {
    /** Feedback category */
    category: FeedbackCategory;
    /** Feedback message */
    message: string;
    /** Optional user email for follow-up */
    email?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Internal feedback event structure
 */
interface FeedbackEvent {
    type: "feedback";
    category: FeedbackCategory;
    message: string;
    email?: string;
    appVersion: string;
    platform: string;
    osVersion?: string;
    deviceInfo?: DeviceInfo;
    metadata?: Record<string, unknown>;
    timestamp: string;
}
/** Crash severity levels */
type CrashSeverity = "warning" | "error" | "fatal";
/**
 * Stack frame information
 */
interface StackFrame {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
    isNative?: boolean;
}
/**
 * Breadcrumb for crash context
 */
interface Breadcrumb {
    /** Type of breadcrumb (navigation, click, xhr, console, etc.) */
    type: string;
    /** Human-readable message */
    message: string;
    /** ISO timestamp */
    timestamp: string;
    /** Additional data */
    data?: Record<string, unknown>;
}
/**
 * Options for reporting a crash
 */
interface CrashReportOptions {
    /** The error that occurred */
    error: Error;
    /** App state at the time of crash */
    appState?: Record<string, unknown>;
    /** Severity level (default: "error") */
    severity?: CrashSeverity;
    /** Additional tags */
    tags?: Record<string, string>;
}
/**
 * Options for capturing an exception
 */
interface CaptureExceptionOptions {
    /** App state at the time of crash */
    appState?: Record<string, unknown>;
    /** Severity level (default: "error") */
    severity?: CrashSeverity;
    /** Additional tags */
    tags?: Record<string, string>;
}
/**
 * Internal crash event structure
 */
interface CrashEvent {
    type: "crash";
    errorType: string;
    errorMessage: string;
    stackTrace: StackFrame[];
    appVersion: string;
    platform: string;
    osVersion?: string;
    deviceInfo?: DeviceInfo;
    appState?: Record<string, unknown>;
    breadcrumbs: Breadcrumb[];
    severity: CrashSeverity;
    userId?: string;
    timestamp: string;
}
/**
 * Device information collected automatically
 */
interface DeviceInfo {
    /** Device model (if available) */
    model?: string;
    /** Device manufacturer (if available) */
    manufacturer?: string;
    /** Number of CPU cores */
    cpuCores?: number;
    /** Total memory in bytes */
    memoryTotal?: number;
    /** Free memory in bytes */
    memoryFree?: number;
    /** Screen width */
    screenWidth?: number;
    /** Screen height */
    screenHeight?: number;
    /** Device pixel ratio */
    pixelRatio?: number;
    /** Browser or runtime info */
    userAgent?: string;
    /** Locale (e.g., "en-US") */
    locale?: string;
    /** Timezone */
    timezone?: string;
}
/**
 * User identification (optional)
 */
interface UserInfo {
    /** Unique user identifier */
    id: string;
    /** User email (optional) */
    email?: string;
    /** Username (optional) */
    username?: string;
    /** Additional user data */
    [key: string]: unknown;
}
/**
 * API success response
 */
interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}
/**
 * API error response
 */
interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
/**
 * Combined API response type
 */
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
/**
 * Feedback submission response
 */
interface FeedbackSubmitResponse {
    id: string;
}
/**
 * Crash report submission response
 */
interface CrashReportResponse {
    id: string;
    groupId: string;
}
/**
 * Queued event for offline storage
 */
interface QueuedEvent {
    id: string;
    event: FeedbackEvent | CrashEvent;
    attempts: number;
    createdAt: string;
    lastAttemptAt?: string;
}

/**
 * @oasis/sdk - API Client
 *
 * Handles HTTP communication with the Oasis server.
 */

/**
 * API client for communicating with the Oasis server.
 */
declare class OasisClient {
    private config;
    private appSlug;
    constructor(config: OasisConfig);
    /**
     * Extract the app slug from the API key.
     *
     * @param apiKey - The public API key (format: pk_app-slug_randomchars)
     * @returns The app slug
     */
    private extractAppSlug;
    /**
     * Send a feedback event to the server.
     *
     * @param event - The feedback event
     * @returns The server response
     */
    sendFeedback(event: FeedbackEvent): Promise<FeedbackSubmitResponse>;
    /**
     * Send a crash report to the server.
     *
     * @param event - The crash event
     * @returns The server response
     */
    sendCrash(event: CrashEvent): Promise<CrashReportResponse>;
    /**
     * Make an HTTP request to the Oasis server.
     *
     * @param url - Request URL
     * @param body - Request body
     * @returns Parsed response data
     */
    private request;
    /**
     * Get the app slug.
     */
    getAppSlug(): string;
}

/**
 * @oasis/sdk - Offline Queue
 *
 * Handles queueing and retry of events when offline.
 */

/**
 * Event queue manager for offline support.
 */
declare class EventQueue {
    private queue;
    private processing;
    private sendFn;
    constructor();
    /**
     * Set the function used to send events.
     *
     * @param fn - The send function
     */
    setSendFunction(fn: (event: FeedbackEvent | CrashEvent) => Promise<void>): void;
    /**
     * Add an event to the queue.
     *
     * @param event - The event to queue
     */
    enqueue(event: FeedbackEvent | CrashEvent): void;
    /**
     * Process the queue, attempting to send events.
     */
    processQueue(): Promise<void>;
    /**
     * Get the current queue size.
     *
     * @returns Number of events in the queue
     */
    size(): number;
    /**
     * Clear the queue.
     */
    clear(): void;
    /**
     * Load queue from localStorage.
     */
    private loadFromStorage;
    /**
     * Save queue to localStorage.
     */
    private saveToStorage;
    /**
     * Generate a unique ID for a queued event.
     */
    private generateId;
}

/**
 * @oasis/sdk - Feedback Submission
 *
 * Handles user feedback collection and submission.
 */

/**
 * Feedback manager for submitting user feedback.
 */
declare class FeedbackManager {
    private config;
    private client;
    private queue;
    constructor(config: OasisConfig, client: OasisClient, queue: EventQueue);
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
    submit(options: FeedbackOptions): Promise<void>;
    /**
     * Submit a bug report.
     *
     * @param message - Bug description
     * @param email - Optional contact email
     */
    reportBug(message: string, email?: string): Promise<void>;
    /**
     * Submit a feature request.
     *
     * @param message - Feature description
     * @param email - Optional contact email
     */
    requestFeature(message: string, email?: string): Promise<void>;
    /**
     * Submit general feedback.
     *
     * @param message - Feedback message
     * @param email - Optional contact email
     */
    sendFeedback(message: string, email?: string): Promise<void>;
    /**
     * Create a feedback event from options.
     */
    private createFeedbackEvent;
    /**
     * Send event or queue it for later if offline/failed.
     */
    private sendOrQueue;
}

/**
 * @oasis/sdk - Breadcrumb Collection
 *
 * Tracks user actions and events to provide context for crash reports.
 */

/**
 * Breadcrumb manager for collecting user action context.
 */
declare class BreadcrumbManager {
    private breadcrumbs;
    private maxBreadcrumbs;
    constructor(maxBreadcrumbs?: number);
    /**
     * Add a breadcrumb to the trail.
     *
     * @param breadcrumb - The breadcrumb to add
     */
    add(breadcrumb: Omit<Breadcrumb, "timestamp">): void;
    /**
     * Add a navigation breadcrumb.
     *
     * @param from - Previous location/route
     * @param to - New location/route
     */
    addNavigation(from: string, to: string): void;
    /**
     * Add a click breadcrumb.
     *
     * @param target - Description of the clicked element
     * @param data - Additional click data
     */
    addClick(target: string, data?: Record<string, unknown>): void;
    /**
     * Add an HTTP request breadcrumb.
     *
     * @param method - HTTP method
     * @param url - Request URL
     * @param statusCode - Response status code (if available)
     */
    addHttp(method: string, url: string, statusCode?: number): void;
    /**
     * Add a console breadcrumb.
     *
     * @param level - Console level (log, warn, error)
     * @param message - Console message
     */
    addConsole(level: "log" | "warn" | "error", message: string): void;
    /**
     * Add a user action breadcrumb.
     *
     * @param action - Action description
     * @param data - Additional action data
     */
    addUserAction(action: string, data?: Record<string, unknown>): void;
    /**
     * Add a custom breadcrumb.
     *
     * @param type - Breadcrumb type
     * @param message - Breadcrumb message
     * @param data - Additional data
     */
    addCustom(type: string, message: string, data?: Record<string, unknown>): void;
    /**
     * Get all breadcrumbs.
     *
     * @returns Array of breadcrumbs
     */
    getAll(): Breadcrumb[];
    /**
     * Clear all breadcrumbs.
     */
    clear(): void;
    /**
     * Set the maximum number of breadcrumbs to keep.
     *
     * @param max - Maximum breadcrumb count
     */
    setMaxBreadcrumbs(max: number): void;
}

/**
 * @oasis/sdk - Crash Reporting
 *
 * Handles crash report creation and submission.
 */

/**
 * Crash reporter for capturing and sending error reports.
 */
declare class CrashReporter {
    private config;
    private client;
    private breadcrumbs;
    private queue;
    private user;
    private globalCleanup;
    constructor(config: OasisConfig, client: OasisClient, breadcrumbs: BreadcrumbManager, queue: EventQueue);
    /**
     * Report a crash/error to Oasis.
     *
     * @param options - Crash report options
     */
    report(options: CrashReportOptions): Promise<void>;
    /**
     * Capture an exception and report it.
     * Useful for try/catch blocks.
     *
     * @param error - The error to capture
     * @param options - Additional options
     */
    captureException(error: unknown, options?: CaptureExceptionOptions): Promise<void>;
    /**
     * Set the current user for crash attribution.
     *
     * @param user - User information
     */
    setUser(user: UserInfo | null): void;
    /**
     * Enable automatic crash reporting for uncaught errors.
     */
    enableAutoCrashReporting(): void;
    /**
     * Disable automatic crash reporting.
     */
    disableAutoCrashReporting(): void;
    /**
     * Create a crash event from an error.
     */
    private createCrashEvent;
    /**
     * Normalize any value to an Error object.
     */
    private normalizeError;
    /**
     * Send event or queue it for later if offline/failed.
     */
    private sendOrQueue;
}

/**
 * @oasis/sdk - Main Entry Point
 *
 * TypeScript SDK for Oasis - Feedback and Crash Analytics for Tauri apps
 *
 * @example
 * ```typescript
 * import { initOasis } from '@oasis/sdk';
 *
 * const oasis = initOasis({
 *   apiKey: 'pk_my-app_a1b2c3d4e5f6g7h8',
 *   serverUrl: 'https://updates.myapp.com',
 *   appVersion: '1.2.3',
 *   enableAutoCrashReporting: true,
 * });
 *
 * // Submit feedback
 * await oasis.feedback.submit({
 *   category: 'bug',
 *   message: 'Something went wrong',
 *   email: 'user@example.com',
 * });
 *
 * // Report a crash manually
 * await oasis.crashes.report({
 *   error: new Error('Failed to save'),
 *   appState: { screen: 'settings' },
 * });
 *
 * // Capture exception in try/catch
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   oasis.crashes.captureException(error);
 * }
 *
 * // Add breadcrumbs for crash context
 * oasis.breadcrumbs.add({
 *   type: 'navigation',
 *   message: 'User navigated to Settings',
 * });
 *
 * // Set user for tracking
 * oasis.setUser({ id: 'user-123' });
 * ```
 */

/**
 * The main Oasis SDK instance.
 */
interface OasisInstance {
    /** Feedback submission interface */
    feedback: FeedbackManager;
    /** Crash reporting interface */
    crashes: CrashReporter;
    /** Breadcrumb management interface */
    breadcrumbs: BreadcrumbManager;
    /**
     * Set the current user for crash attribution.
     *
     * @param user - User information or null to clear
     */
    setUser(user: UserInfo | null): void;
    /**
     * Get the current configuration.
     */
    getConfig(): Readonly<OasisConfig>;
    /**
     * Manually flush the event queue.
     */
    flush(): Promise<void>;
    /**
     * Destroy the SDK instance and clean up resources.
     */
    destroy(): void;
}
/**
 * Initialize the Oasis SDK.
 *
 * @param config - SDK configuration
 * @returns Initialized SDK instance
 *
 * @example
 * ```typescript
 * const oasis = initOasis({
 *   apiKey: 'pk_my-app_a1b2c3d4e5f6g7h8',
 *   serverUrl: 'https://updates.myapp.com',
 *   appVersion: '1.2.3',
 *   enableAutoCrashReporting: true,
 * });
 * ```
 */
declare function initOasis(config: OasisConfig): OasisInstance;

export { type ApiErrorResponse, type ApiResponse, type ApiSuccessResponse, type Breadcrumb, type CaptureExceptionOptions, type CrashEvent, type CrashReportOptions, type CrashReportResponse, type CrashSeverity, type DeviceInfo, type FeedbackCategory, type FeedbackEvent, type FeedbackOptions, type FeedbackSubmitResponse, type OasisConfig, type OasisInstance, type QueuedEvent, type StackFrame, type UserInfo, initOasis as default, initOasis };
