/**
 * @typedef {Object} VitestAssertionResult
 * @property {string} [status]
 */

/**
 * @typedef {Object} VitestSuiteResult
 * @property {string} [name]
 * @property {string} [status]
 * @property {VitestAssertionResult[]} [assertionResults]
 */

/**
 * @typedef {Object} VitestJsonReport
 * @property {VitestSuiteResult[]} [testResults]
 */

const FAILURE_STATUS = new Set(['failed']);

/**
 * @param {unknown} report
 * @returns {VitestJsonReport | null}
 */
function normalizeReport(report) {
  if (!report) return null;
  if (typeof report === 'string') {
    try {
      const parsed = JSON.parse(report);
      return typeof parsed === 'object' && parsed ? parsed : null;
    } catch (error) {
      return null;
    }
  }
  if (typeof report === 'object') {
    return /** @type {VitestJsonReport} */ (report);
  }
  return null;
}

/**
 * @param {VitestSuiteResult | null | undefined} suite
 * @returns {boolean}
 */
function suiteHasFailures(suite) {
  if (!suite) return false;
  if (suite.status && FAILURE_STATUS.has(suite.status)) {
    return true;
  }
  if (Array.isArray(suite.assertionResults)) {
    return suite.assertionResults.some((assertion) =>
      assertion?.status ? FAILURE_STATUS.has(assertion.status) : false,
    );
  }
  return false;
}

/**
 * @param {unknown} report
 * @returns {string[]}
 */
export function collectFailedTestFiles(report) {
  const normalized = normalizeReport(report);
  if (!normalized || !Array.isArray(normalized.testResults)) {
    return [];
  }

  const seen = new Set();
  const failedSuites = [];

  for (const suite of normalized.testResults) {
    if (!suiteHasFailures(suite)) {
      continue;
    }
    const name = suite?.name;
    if (typeof name !== 'string' || !name.trim()) {
      continue;
    }
    if (!seen.has(name)) {
      seen.add(name);
      failedSuites.push(name);
    }
  }

  return failedSuites;
}
