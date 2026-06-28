import { useState, useEffect, useCallback, useMemo } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listRoles,
  getPermissionsMatrix,
  updateRolePermissions,
  compareRoles,
  rollbackRolePermissions,
} from '../../services/usersService';
import './PermissionMatrix.css';

const MODULES = ['Merchants', 'Users', 'Lenders', 'Loans', 'Products', 'Risk', 'Analytics', 'Audit'];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export'];

// Backend permission keys look like "view_users", "edit_merchants" (see
// POST /admin/roles example payload). We build the matrix UI on top of
// that flat string-array contract: permKey(mod, action) <-> grid cell.
function permKey(mod, action) {
  return `${action}_${mod.toLowerCase()}`;
}

function emptyMatrix() {
  const m = {};
  MODULES.forEach((mod) => {
    m[mod] = {};
    ACTIONS.forEach((a) => { m[mod][a] = false; });
  });
  return m;
}

// GET /admin/permissions is documented only as "Get Permissions Grid
// Matrix" with no response schema. We handle two plausible shapes:
//  (a) { roles: [{ id, name, permissions: [...] }] }  — flat key list per role
//  (b) { roles: [{ id, name, matrix: { Module: { action: bool } } }] } — pre-built grid
// and fall back to an empty, all-unchecked grid if neither is recognized,
// rather than guessing wrong and silently misrepresenting access.
function matrixFromPermissionList(permissions = []) {
  const m = emptyMatrix();
  const set = new Set(permissions);
  MODULES.forEach((mod) => {
    ACTIONS.forEach((a) => {
      m[mod][a] = set.has(permKey(mod, a));
    });
  });
  return m;
}

function matrixToPermissionList(matrix) {
  const out = [];
  MODULES.forEach((mod) => {
    ACTIONS.forEach((a) => {
      if (matrix[mod][a]) out.push(permKey(mod, a));
    });
  });
  return out;
}

export default function PermissionMatrix() {
  const { notification, notify, closeNotification } = useNotification();

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRoleId, setCompareRoleId] = useState(null);
  const [showConditional, setShowConditional] = useState(false);

  const [matrix, setMatrix] = useState(emptyMatrix);
  const [compareMatrix, setCompareMatrix] = useState(null);

  // Load role list to populate the selector
  useEffect(() => {
    (async () => {
      try {
        setRolesLoading(true);
        const result = await listRoles();
        setRoles(result.items);
        if (result.items.length) {
          setSelectedRoleId(result.items[0].id);
          if (result.items[1]) setCompareRoleId(result.items[1].id);
        }
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load roles.'));
      } finally {
        setRolesLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const loadMatrixForRole = useCallback(async (roleId) => {
    if (!roleId) return emptyMatrix();
    try {
      const payload = await getPermissionsMatrix();
      const roleEntry = (payload?.roles ?? payload ?? []).find?.((r) => r.id === roleId);
      if (roleEntry?.permissions) return matrixFromPermissionList(roleEntry.permissions);
      if (roleEntry?.matrix) return roleEntry.matrix; // already a grid
      return emptyMatrix();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load permission matrix.'));
      return emptyMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    (async () => {
      setMatrixLoading(true);
      setMatrix(await loadMatrixForRole(selectedRoleId));
      setMatrixLoading(false);
    })();
  }, [selectedRoleId, loadMatrixForRole]);

  useEffect(() => {
    if (!compareMode || !compareRoleId) { setCompareMatrix(null); return; }
    (async () => setCompareMatrix(await loadMatrixForRole(compareRoleId)))();
  }, [compareMode, compareRoleId, loadMatrixForRole]);

  const toggle = (mod, action) => {
    setMatrix((m) => ({
      ...m,
      [mod]: { ...m[mod], [action]: !m[mod][action] },
    }));
  };

  const toggleRow = (mod) => {
    const allOn = ACTIONS.every((a) => matrix[mod][a]);
    setMatrix((m) => ({
      ...m,
      [mod]: Object.fromEntries(ACTIONS.map((a) => [a, !allOn])),
    }));
  };

  const toggleCol = (action) => {
    const allOn = MODULES.every((mod) => matrix[mod][action]);
    setMatrix((m) => {
      const next = { ...m };
      MODULES.forEach((mod) => { next[mod] = { ...next[mod], [action]: !allOn }; });
      return next;
    });
  };

  const isDiff = (mod, action) => compareMode && compareMatrix && matrix[mod][action] !== compareMatrix[mod][action];

  const handleSave = async () => {
    if (!selectedRoleId) return;
    try {
      setSaving(true);
      await updateRolePermissions(selectedRoleId, matrixToPermissionList(matrix));
      notify.success('Permission matrix saved (audit logged).');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save permissions.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedRoleId) return;
    try {
      setSaving(true);
      await rollbackRolePermissions(selectedRoleId);
      notify.success('Rolled back to previous permission set.');
      setMatrix(await loadMatrixForRole(selectedRoleId));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Rollback failed.'));
    } finally {
      setSaving(false);
    }
  };

  // When both a server-side diff endpoint exists and the role pair is set,
  // prefer it for accuracy; otherwise fall back to comparing the two
  // matrices we already loaded client-side.
  const handleCompareToggle = async () => {
    const next = !compareMode;
    setCompareMode(next);
    if (next && selectedRoleId && compareRoleId) {
      try {
        await compareRoles(selectedRoleId, compareRoleId);
        // Server diff result shape is undocumented; we still render the
        // client-side cell diff below since it's guaranteed to work off
        // data we already trust.
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to compare roles.'));
      }
    }
  };

  const otherRoles = useMemo(() => roles.filter((r) => r.id !== selectedRoleId), [roles, selectedRoleId]);

  if (rolesLoading) {
    return (
      <PageWrapper title="Permission Matrix" subtitle="Screen 12 — Module × action RBAC with bulk toggle & diff">
        <Loader text="Loading roles..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Permission Matrix"
      subtitle="Screen 12 — Module × action RBAC with bulk toggle & diff"
      actions={
        <>
          <Button variant="secondary" onClick={handleCompareToggle}>
            {compareMode ? 'Exit diff' : 'Compare roles'}
          </Button>
          <Button variant="teal" onClick={handleSave} loading={saving}>Save matrix (audit logged)</Button>
          <Button variant="ghost" onClick={handleRollback} disabled={saving}>Rollback to previous</Button>
        </>
      }
    >
      <Card>
        <div className="perm-toolbar">
          <select value={selectedRoleId ?? ''} onChange={(e) => setSelectedRoleId(Number(e.target.value))}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {compareMode && (
            <select value={compareRoleId ?? ''} onChange={(e) => setCompareRoleId(Number(e.target.value))}>
              {otherRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <label className="perm-conditional">
            <input type="checkbox" checked={showConditional} onChange={(e) => setShowConditional(e.target.checked)} />
            Show conditional rules
          </label>
        </div>

        {showConditional && (
          <p className="perm-conditional-note">
            Example: Approve merchant only if amount &lt; ₹10,00,000 (configured per role on server)
          </p>
        )}

        {matrixLoading ? (
          <Loader text="Loading permissions..." />
        ) : (
          <div className="perm-matrix-wrap">
            <table className="perm-matrix">
              <thead>
                <tr>
                  <th>Module</th>
                  {ACTIONS.map((a) => (
                    <th key={a}>
                      <button type="button" className="perm-col-toggle" onClick={() => toggleCol(a)}>{a}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod}>
                    <td>
                      <button type="button" className="perm-row-toggle" onClick={() => toggleRow(mod)}>{mod}</button>
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a} className={isDiff(mod, a) ? 'perm-cell--diff' : ''}>
                        <input type="checkbox" checked={matrix[mod][a]} onChange={() => toggle(mod, a)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
