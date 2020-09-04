const {
  cleanEnv,
  makeValidator,
  bool,
  url,
} = require('envalid');

const nonemptystr = makeValidator((v) => {
  const err = new Error('Expected a non-empty string');
  if (v === undefined || v === null || v === '') {
    throw err;
  }
  const trimmed = String(v).trim();
  if (!trimmed) throw err;
  return trimmed;
});

module.exports = cleanEnv(process.env, {
  GRAPHQL_URI: url({ desc: 'The PUBLIC GraphQL URL', devDefault: 'http://host.docker.internal:8100' }),

  /**
   * @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration#environment
   */
  NEW_RELIC_ENABLED: bool({ desc: 'Whether New Relic is enabled.', default: true, devDefault: false }),
  NEW_RELIC_APP_NAME: nonemptystr({ desc: 'The New Relic application name.', default: 'nativex-web' }),
  NEW_RELIC_LICENSE_KEY: nonemptystr({ desc: 'The license key for New Relic.', devDefault: '(unset)' }),

  /**
   * @see https://docs.datadoghq.com/tracing/setup/nodejs/#instrumentation for more options
   */
  DD_TRACE_ENABLED: bool({ desc: 'Whether Datadog is enabled.', default: false, devDefault: false }),
  DD_SERVICE: nonemptystr({ desc: 'The Datadog service name', default: 'native-x-web' }),
});
