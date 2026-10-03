import React from 'react';
import { RuleGateArchetypeProps } from '../../types';

export const RuleGateArchetype: React.FC<RuleGateArchetypeProps> = ({
  data,
  onExecuteMitigation,
}) => {
  const failedRules = data.rules.filter((r) => !r.passed);

  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-ink-primary">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-desk-title font-bold">{data.policyName}</h3>
          <p className="text-console text-ink-secondary">Policy ID: {data.policyId}</p>
        </div>
        <span className="text-console font-mono">
          {data.rules.length - failedRules.length} / {data.rules.length} Passed
        </span>
      </div>

      {/* Rules Table */}
      <div className="overflow-x-auto my-4">
        <table className="w-full text-left text-console border-collapse">
          <thead>
            <tr className="border-b border-border-strong text-ink-secondary">
              <th className="py-2 px-3">Rule</th>
              <th className="py-2 px-3">Condition</th>
              <th className="py-2 px-3">Actual vs Target</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rules.map((rule) => (
              <tr key={rule.ruleId} className="border-b border-border-subtle hover:bg-surface-elevated">
                <td className="py-3 px-3 font-semibold">{rule.description}</td>
                <td className="py-3 px-3 font-mono text-ink-primary">{rule.condition}</td>
                <td className="py-3 px-3 font-mono">
                  <span className={rule.passed ? 'text-status-healthy-fg' : 'text-status-critical-fg'}>
                    {rule.actualValue}
                  </span>
                  <span className="text-ink-muted"> / {rule.targetValue}</span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-console font-bold ${
                      rule.passed
                        ? 'bg-status-healthy-bg text-status-healthy-fg border border-status-healthy-border'
                        : 'bg-status-critical-bg text-status-critical-fg border border-status-critical-border'
                    }`}
                  >
                    {rule.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Controls */}
      {failedRules.length > 0 && onExecuteMitigation && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={() => onExecuteMitigation('OVERRIDE_POLICY_GATE', { policyId: data.policyId })}
            className="smart-launcher-button"
          >
            🛡️ Request Manager Policy Override
          </button>
        </div>
      )}
    </div>
  );
};