import { describe, expect, it } from 'vitest';

import { MORE_GROUPS, visibleMoreGroups } from './menu-config';

describe('more menu configuration', () => {
  it('keeps stable unique ids and routes across groups', () => {
    const destinations = MORE_GROUPS.flatMap((group) => group.destinations);
    expect(new Set(destinations.map((destination) => destination.id)).size).toBe(destinations.length);
    expect(new Set(destinations.map((destination) => destination.route)).size).toBe(destinations.length);
  });

  it('separates features, management, and system destinations', () => {
    expect(MORE_GROUPS.map((group) => group.id)).toEqual(['features', 'management', 'system']);
    expect(MORE_GROUPS.find((group) => group.id === 'management')?.destinations.map((item) => item.route))
      .toEqual(['/items', '/accounts', '/record-management']);
  });

  it('can hide personal AI without restructuring the menu', () => {
    const routes = visibleMoreGroups(['core']).flatMap((group) => group.destinations.map((item) => item.route));
    expect(routes).not.toContain('/analysis');
    expect(routes).toContain('/settings');
  });
});
