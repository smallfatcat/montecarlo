import { useState, useRef } from 'react'
import { PokerTableHorseshoeView } from './PokerTableHorseshoeView'
import { usePokerLayoutEditor } from './hooks/usePokerLayoutEditor'

export function PokerLayoutEditorPage() {
  const { mockTable, revealed, mockData } = usePokerLayoutEditor()
  const [editMode, setEditMode] = useState(true)
  const tableRef = useRef<any>(null)

  const handleExportLayout = () => {
    if (tableRef.current?.exportLayoutToJson) {
      tableRef.current.exportLayoutToJson()
    }
  }

  const handleResetLayout = () => {
    if (tableRef.current?.resetLayout) {
      tableRef.current.resetLayout()
    }
  }

  const handleToggleEditMode = () => {
    setEditMode(!editMode)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '20px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '28px' }}>
            🎯 Poker Table Layout Editor
          </h1>
          <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            Design and customize poker table layouts for the entire app
          </p>
        </div>
        
        {/* Control Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleToggleEditMode}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: editMode ? '#4CAF50' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {editMode ? '🖊️ Edit Mode' : '👁️ Preview Mode'}
          </button>
          
          <button
            onClick={handleExportLayout}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#FF9800',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            📥 Export Layout
          </button>
          
          <button
            onClick={handleResetLayout}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#F44336',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            🔄 Reset Layout
          </button>
        </div>
      </div>

      {/* Instructions */}
      {editMode ? (
        <div style={{
          background: 'rgba(255,255,0,0.1)',
          border: '1px solid rgba(255,255,0,0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#FFD54F'
        }}>
          <strong>💡 Edit Mode Active:</strong> 
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>🖱️ <strong>Drag seats</strong> to reposition them (click and drag)</li>
            <li>🎮 <strong>Drag controls</strong> to move betting buttons and inputs</li>
            <li>🃏 <strong>Drag board</strong> to move the community cards area</li>
            <li>💰 <strong>Drag pot</strong> to reposition the pot display</li>
            <li>🪙 <strong>Drag chip stacks</strong> to move player stack displays</li>
            <li>🎯 <strong>Drag betting spots</strong> to adjust bet positions</li>
            <li>📐 <strong>Grid snapping</strong> helps with precise positioning</li>
            <li>💾 <strong>Changes save automatically</strong> as you drag</li>
            <li>📥 <strong>Export Layout</strong> to save your custom layout</li>
          </ul>
        </div>
      ) : (
        <div style={{
          background: 'rgba(0,255,255,0.1)',
          border: '1px solid rgba(0,255,255,0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#00BCD4'
        }}>
          <strong>👁️ Preview Mode Active:</strong> 
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>🔒 <strong>Layout locked</strong> - no editing possible</li>
            <li>👀 <strong>View only</strong> - see how your layout looks</li>
            <li>🖊️ <strong>Click "Edit Mode"</strong> to make changes</li>
          </ul>
        </div>
      )}

      {/* Poker Table */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.05)',
        borderRadius: '16px',
        padding: '20px'
      }}>
        <PokerTableHorseshoeView
          ref={tableRef}
          table={mockTable}
          revealed={revealed}
          hideHoleCardsUntilShowdown={false}
          editLayoutMode={editMode}
          // Mock data for all components
          onSitHere={(seatIndex) => console.log(`Sit at seat ${seatIndex}`)}
          mySeatIndex={0}
          playerNames={mockData.playerNames}
          winnersSet={mockData.winnersSet}
          highlightSet={mockData.highlightSet}
          showdownText={mockData.showdownText}
          equity={mockData.equity}
          available={mockData.available}
          onFold={() => console.log('Fold')}
          onCheck={() => console.log('Check')}
          onCall={() => console.log('Call')}
          onBet={(amount) => console.log(`Bet ${amount}`)}
          onRaise={(amount) => console.log(`Raise ${amount}`)}
        />
      </div>

      {/* Layout Info */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Layout Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <strong>Mode:</strong> {editMode ? 'Edit' : 'Preview'}
          </div>
          <div>
            <strong>Status:</strong> Ready for editing
          </div>
          <div>
            <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
