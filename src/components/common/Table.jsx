import './Table.css';

export default function Table({ columns, data, onRowClick, emptyMessage = 'No data found' }) {
  if (!data?.length) {
    return <div className="table-empty">{emptyMessage}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id ?? i} onClick={() => onRowClick?.(row)} className={onRowClick ? 'table__row--clickable' : ''}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}