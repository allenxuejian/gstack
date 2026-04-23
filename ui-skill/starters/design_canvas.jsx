// design_canvas.jsx · 多方案并排画布
// 用法：在主 prototype.html 里 <script type="text/babel" src="starters/design_canvas.jsx"></script>
// 结尾记得 Object.assign(window, { DesignCanvas, Cell });
//
// 这是 Claude Design `design_canvas` starter 的等价物。

const designCanvasStyles = {
  wrapper: {
    minHeight: '100vh',
    background: '#fafaf7',
    padding: '48px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 24,
    maxWidth: 1440,
    margin: '0 auto',
  },
  cell: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    padding: 24,
    minHeight: 400,
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 16px',
  },
  content: {
    flex: 1,
    border: '1px dashed #e5e5e5',
    borderRadius: 8,
    padding: 16,
  },
};

function Cell({ id, title, description, children }) {
  return (
    <div style={designCanvasStyles.cell} data-variant={id}>
      <div style={designCanvasStyles.label}>{id}</div>
      <h3 style={designCanvasStyles.title}>{title}</h3>
      {description && <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px' }}>{description}</p>}
      <div style={designCanvasStyles.content}>{children}</div>
    </div>
  );
}

function DesignCanvas({ children }) {
  return (
    <div style={designCanvasStyles.wrapper}>
      <div style={designCanvasStyles.grid}>{children}</div>
    </div>
  );
}

// CRITICAL · 跨 script 共享
Object.assign(window, { DesignCanvas, Cell });
