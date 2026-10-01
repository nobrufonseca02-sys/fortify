import { describe, expect, it } from 'vitest';
import {
  STALE_SYNC_MS,
  STUCK_SYNC_MS,
  assessConnectionHealth,
  resolveAccountStatus,
} from '@/lib/accountHealth';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const healthyConnection = {
  connection_status: 'connected',
  sync_status: 'success',
  sync_error: null,
  last_sync_at: minutesAgo(10),
  updated_at: minutesAgo(10),
};

describe('assessConnectionHealth', () => {
  it('sem conexão', () => {
    expect(assessConnectionHealth(null, { now: NOW }).state).toBe('no_connection');
  });

  it('conexão saudável e recente', () => {
    expect(assessConnectionHealth(healthyConnection, { now: NOW }).state).toBe('healthy');
  });

  it.each(['auth_error', 'disconnected', 'error'])('connection_status %s é erro de conexão', (status) => {
    expect(
      assessConnectionHealth({ ...healthyConnection, connection_status: status }, { now: NOW }).state,
    ).toBe('connection_error');
  });

  it('sync_status error é erro de conexão mesmo com connection_status connected', () => {
    expect(
      assessConnectionHealth({ ...healthyConnection, sync_status: 'error' }, { now: NOW }).state,
    ).toBe('connection_error');
  });

  it('sync_error preenchido é erro de conexão', () => {
    expect(
      assessConnectionHealth({ ...healthyConnection, sync_error: 'falhou' }, { now: NOW }).state,
    ).toBe('connection_error');
  });

  it('sync em andamento há mais que o limite é travado', () => {
    const connection = {
      ...healthyConnection,
      connection_status: 'syncing',
      sync_status: 'running',
      updated_at: new Date(NOW - STUCK_SYNC_MS - 60_000).toISOString(),
    };
    expect(assessConnectionHealth(connection, { now: NOW }).state).toBe('sync_stuck');
  });

  it('primeira sincronização recente em andamento', () => {
    const connection = {
      ...healthyConnection,
      sync_status: 'running',
      last_sync_at: null,
      updated_at: minutesAgo(2),
    };
    expect(assessConnectionHealth(connection, { now: NOW }).state).toBe('syncing');
  });

  it('conectada mas nunca sincronizada é sem dados', () => {
    expect(
      assessConnectionHealth({ ...healthyConnection, last_sync_at: null }, { now: NOW }).state,
    ).toBe('no_data');
  });

  it('última sincronização acima do limite é atrasada', () => {
    const connection = {
      ...healthyConnection,
      last_sync_at: new Date(NOW - STALE_SYNC_MS - 60_000).toISOString(),
    };
    expect(assessConnectionHealth(connection, { now: NOW }).state).toBe('stale');
  });
});

describe('resolveAccountStatus', () => {
  const healthy = { state: 'healthy' as const, lastSyncAt: minutesAgo(10) };

  it('só mostra seguro com conexão saudável, vínculo e regra segura', () => {
    expect(
      resolveAccountStatus({ health: healthy, hasRuleBinding: true, ruleStatus: 'safe' }).status,
    ).toBe('safe');
  });

  it.each(['connection_error', 'stale', 'sync_stuck', 'no_data', 'no_connection'] as const)(
    '%s nunca vira seguro',
    (state) => {
      const view = resolveAccountStatus({
        health: { state, lastSyncAt: null },
        hasRuleBinding: true,
        ruleStatus: 'safe',
      });
      expect(view.status).toBe(state);
      expect(view.tone).not.toBe('success');
    },
  );

  it('erro de autenticação mostra "Conexão com erro" e pede correção', () => {
    const view = resolveAccountStatus({
      health: { state: 'connection_error', lastSyncAt: null },
      hasRuleBinding: true,
      ruleStatus: 'partial',
    });
    expect(view.label).toBe('Conexão com erro');
    expect(view.action).toBe('fix_connection');
  });

  it('sem vínculo de regra não é seguro', () => {
    const view = resolveAccountStatus({ health: healthy, hasRuleBinding: false, ruleStatus: 'safe' });
    expect(view.status).toBe('unbound');
    expect(view.label).toBe('Regra não vinculada');
  });

  it('sem avaliação é sem dados', () => {
    expect(
      resolveAccountStatus({ health: healthy, hasRuleBinding: true, ruleStatus: null }).label,
    ).toBe('Sem dados');
  });

  it('alarme de regra continua visível com dado atrasado, anotado', () => {
    const view = resolveAccountStatus({
      health: { state: 'stale', lastSyncAt: null },
      hasRuleBinding: true,
      ruleStatus: 'critical',
    });
    expect(view.status).toBe('critical');
    expect(view.healthNote).toBe('Sync atrasado');
  });

  it('parcial não é tratado como seguro', () => {
    const view = resolveAccountStatus({ health: healthy, hasRuleBinding: true, ruleStatus: 'partial' });
    expect(view.status).toBe('partial');
    expect(view.tone).not.toBe('success');
  });
});
