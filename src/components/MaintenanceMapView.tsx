import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { calculateMaintenancePayments, BlockStatus } from '../utils';
import { Building, User, Calendar, CreditCard, Search, HelpCircle, CheckCircle, ShieldAlert, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceMapViewProps {
  transactions: Transaction[];
}

export default function MaintenanceMapView({ transactions }: MaintenanceMapViewProps) {
  const [selectedWing, setSelectedWing] = useState<'A' | 'B'>('B'); // Wing B is heavily represented in dataset
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [searchBlock, setSearchBlock] = useState('');
  const [inspectedBlock, setInspectedBlock] = useState<BlockStatus | null>(null);

  // Calculate payments map
  const paymentStats = useMemo(() => {
    return calculateMaintenancePayments(transactions);
  }, [transactions]);

  const activeWingBlocks = useMemo(() => {
    const list = selectedWing === 'A' ? paymentStats.wingA : paymentStats.wingB;
    
    return list.filter(b => {
      const matchesSearch = b.block.includes(searchBlock);
      const matchesStatus = 
        statusFilter === 'All' || 
        (statusFilter === 'Paid' && b.hasPaid) || 
        (statusFilter === 'Unpaid' && !b.hasPaid);
      return matchesSearch && matchesStatus;
    });
  }, [paymentStats, selectedWing, statusFilter, searchBlock]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const allA = paymentStats.wingA;
    const allB = paymentStats.wingB;
    
    const paidA = allA.filter(b => b.hasPaid).length;
    const paidB = allB.filter(b => b.hasPaid).length;
    
    const sumA = allA.reduce((sum, b) => sum + b.amountPaid, 0);
    const sumB = allB.reduce((sum, b) => sum + b.amountPaid, 0);

    return {
      wingA: { total: allA.length, paid: paidA, unpaid: allA.length - paidA, collection: sumA },
      wingB: { total: allB.length, paid: paidB, unpaid: allB.length - paidB, collection: sumB },
    };
  }, [paymentStats]);

  const activeAgg = selectedWing === 'A' ? aggregateStats.wingA : aggregateStats.wingB;

  // Let's group active wing blocks by floor for vertical tower representation!
  // E.g. Block '1202' is Floor 12, '103' is Floor 1
  const floorGroups = useMemo(() => {
    const list = selectedWing === 'A' ? paymentStats.wingA : paymentStats.wingB;
    const groups: { [floor: number]: BlockStatus[] } = {};
    
    list.forEach(b => {
      const blockNum = parseInt(b.block, 10);
      const floor = Math.floor(blockNum / 100);
      if (!groups[floor]) {
        groups[floor] = [];
      }
      groups[floor].push(b);
    });

    // Sort blocks within floor (e.g. 101, 102, 103, 104)
    Object.keys(groups).forEach(floor => {
      groups[Number(floor)].sort((a, b) => a.block.localeCompare(b.block));
    });

    // Return descending list of floors (Floor 12 down to Floor 1) so it mimics a real tower!
    return Object.entries(groups)
      .map(([floor, blocks]) => ({ floor: Number(floor), blocks }))
      .sort((a, b) => b.floor - a.floor);
  }, [paymentStats, selectedWing]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Structural overview & Wing selectors */}
      <div className="bg-[#111111] border border-[#222] p-6 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-serif italic text-[#e4e3e0]">Maintenance Receipt Ledger & Structural Map</h3>
          <p className="text-xs text-[#e4e3e0]/40 mt-1">Visualize maintenance compliance by Wing tower & block numbers</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Wing Toggles */}
          <div className="flex bg-[#080808] border border-[#222] p-1 rounded-lg">
            <button
              onClick={() => { setSelectedWing('A'); setInspectedBlock(null); }}
              className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedWing === 'A' 
                  ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
                  : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'
              }`}
            >
              Tower Wing A
            </button>
            <button
              onClick={() => { setSelectedWing('B'); setInspectedBlock(null); }}
              className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedWing === 'B' 
                  ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
                  : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'
              }`}
            >
              Tower Wing B
            </button>
          </div>

          {/* Status Filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#c5a059] cursor-pointer"
          >
            <option value="All">ALL STATUSES</option>
            <option value="Paid">PAID ONLY</option>
            <option value="Unpaid">UNPAID ONLY</option>
          </select>

          {/* Block search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#e4e3e0]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter Block (e.g. 402)"
              value={searchBlock}
              onChange={(e) => setSearchBlock(e.target.value)}
              className="bg-[#080808] border border-[#222] text-[#e4e3e0] pl-8 pr-3 py-2 rounded-lg text-xs font-mono tracking-wider focus:outline-none w-44"
            />
          </div>
        </div>
      </div>

      {/* Grid statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tower Wing Title */}
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg shadow-md">
          <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Selected Structural Unit</p>
          <p className="text-lg font-serif italic text-[#c5a059] mt-1.5">Orchid Heights Wing {selectedWing}</p>
        </div>

        {/* Collection Amount */}
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg shadow-md">
          <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Tower Maintenance Receipts</p>
          <p className="text-xl font-mono font-bold text-[#66bb6a] mt-1">{formatCurrency(activeAgg.collection)}</p>
        </div>

        {/* Paid Stats */}
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Paid Maintenance Blocks</p>
            <p className="text-xl font-mono font-bold text-[#e4e3e0] mt-1">{activeAgg.paid} / {activeAgg.total}</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#66bb6a] bg-[#66bb6a]/15 border border-[#66bb6a]/30 px-2 py-0.5 rounded">
            {((activeAgg.paid / activeAgg.total) * 100).toFixed(0)}% PAID
          </span>
        </div>

        {/* Defaulter Stats */}
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Unpaid / Defaulter Blocks</p>
            <p className="text-xl font-mono font-bold text-[#ff5555] mt-1">{activeAgg.unpaid}</p>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#ff5555] bg-[#ff5555]/15 border border-[#ff5555]/30 px-2 py-0.5 rounded">
            {((activeAgg.unpaid / activeAgg.total) * 100).toFixed(0)}% PENDING
          </span>
        </div>
      </div>

      {/* Main Structural Map Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tower elevation map */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-5">
            <div>
              <h4 className="text-sm font-serif italic text-[#e4e3e0]">Tower Block Elevation View</h4>
              <p className="text-xs text-[#e4e3e0]/40 mt-1">Click any block block to inspect financial voucher ledger details</p>
            </div>
            {/* Color key */}
            <div className="flex gap-4 text-[10px] font-mono uppercase tracking-wider text-[#e4e3e0]/40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#66bb6a]/20 border border-[#66bb6a]/40 rounded-sm"></span>
                <span>Paid Ledger</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-[#161616] border border-[#222] rounded-sm"></span>
                <span>Pending Ledger</span>
              </div>
            </div>
          </div>

          {/* Elevator Tower Structure Layout */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 pb-4">
            {floorGroups.map((group) => {
              // Filter blocks inside floor by search and status
              const visibleBlocksOnFloor = group.blocks.filter(b => {
                const matchesSearch = b.block.includes(searchBlock);
                const matchesStatus = 
                  statusFilter === 'All' || 
                  (statusFilter === 'Paid' && b.hasPaid) || 
                  (statusFilter === 'Unpaid' && !b.hasPaid);
                return matchesSearch && matchesStatus;
              });

              if (visibleBlocksOnFloor.length === 0) return null;

              return (
                <div key={group.floor} className="flex items-center gap-4">
                  {/* Floor indicator */}
                  <div className="w-16 font-mono text-[10px] font-bold text-[#e4e3e0]/40 uppercase tracking-wider text-right shrink-0">
                    Floor {group.floor}
                  </div>
                  
                  {/* Block grid for this floor */}
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    {group.blocks.map(b => {
                      const isVisible = visibleBlocksOnFloor.some(vb => vb.block === b.block);
                      const isInspected = inspectedBlock?.block === b.block;

                      return (
                        <button
                          key={b.block}
                          onClick={() => setInspectedBlock(b)}
                          className={`py-3 px-2 rounded border text-center transition-all cursor-pointer relative overflow-hidden group ${
                            !isVisible 
                              ? 'opacity-20 pointer-events-none' 
                              : ''
                          } ${
                            b.hasPaid 
                              ? 'bg-emerald-950/20 text-[#66bb6a] border-[#66bb6a]/30 hover:bg-emerald-900/20 hover:border-[#66bb6a]/60 shadow-inner' 
                              : 'bg-[#161616] text-[#e4e3e0]/60 border-[#222] hover:bg-[#1f1f1f] hover:text-[#e4e3e0]'
                          } ${
                            isInspected ? 'ring-1 ring-[#c5a059] border-transparent' : ''
                          }`}
                        >
                          <div className="text-xs font-mono font-bold tracking-wide">
                            {b.block}
                          </div>
                          <div className="text-[9px] font-sans truncate opacity-60 max-w-full px-1 mt-0.5">
                            {b.residentName !== 'Unassigned' ? b.residentName : '—'}
                          </div>
                          
                          {/* Checked indicator */}
                          {b.hasPaid && (
                            <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Check className="w-2.5 h-2.5 text-[#66bb6a]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Inspector Panel */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg shadow-sm self-start">
          <div className="border-b border-[#222] pb-4 mb-4">
            <h4 className="text-sm font-serif italic text-[#e4e3e0]">Resident Unit Auditor</h4>
            <p className="text-xs text-[#e4e3e0]/40 mt-1">Audit log inspector for selected block</p>
          </div>

          <AnimatePresence mode="wait">
            {inspectedBlock ? (
              <motion.div
                key={inspectedBlock.block}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Visual Title card */}
                <div className={`p-4 rounded border flex items-center justify-between ${
                  inspectedBlock.hasPaid 
                    ? 'bg-emerald-950/20 text-emerald-300 border-[#66bb6a]/20' 
                    : 'bg-[#161616] text-[#e4e3e0]/80 border-[#222]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a059] font-semibold">Unit Designation</span>
                    <p className="text-xl font-serif italic mt-1">Wing {selectedWing} - {inspectedBlock.block}</p>
                  </div>
                  <span className={`p-2.5 rounded border ${
                    inspectedBlock.hasPaid 
                      ? 'bg-emerald-950 text-[#66bb6a] border-emerald-900/50' 
                      : 'bg-[#1e1e1e] text-neutral-500 border-[#222]'
                  }`}>
                    <Building className="w-4 h-4" />
                  </span>
                </div>

                {/* Audit details */}
                <div className="space-y-3.5 pt-2">
                  {/* Resident name */}
                  <div className="flex gap-3">
                    <span className="p-2 bg-[#161616] text-[#c5a059]/80 border border-[#222] rounded shrink-0 flex items-center justify-center h-8 w-8">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Resident Name</span>
                      <p className="text-sm font-sans font-semibold text-[#e4e3e0] mt-0.5">
                        {inspectedBlock.residentName !== 'Unassigned' ? inspectedBlock.residentName : 'No active resident name logged'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex gap-3">
                    <span className={`p-2 border rounded shrink-0 flex items-center justify-center h-8 w-8 ${
                      inspectedBlock.hasPaid 
                        ? 'bg-emerald-950/40 text-[#66bb6a] border-[#66bb6a]/20' 
                        : 'bg-rose-950/40 text-[#ff5555] border-[#ff5555]/20'
                    }`}>
                      {inspectedBlock.hasPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Maintenance Status</span>
                      <div className="mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono tracking-wider font-semibold rounded uppercase ${
                          inspectedBlock.hasPaid 
                            ? 'bg-[#66bb6a]/15 text-[#66bb6a] border border-[#66bb6a]/30' 
                            : 'bg-[#ff5555]/15 text-[#ff5555] border border-[#ff5555]/30'
                        }`}>
                          {inspectedBlock.hasPaid ? 'COMPLIANT' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Paid amount */}
                  <div className="flex gap-3">
                    <span className="p-2 bg-[#161616] text-[#c5a059]/80 border border-[#222] rounded shrink-0 flex items-center justify-center h-8 w-8">
                      <CreditCard className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Total Amount Received</span>
                      <p className="text-sm font-mono font-bold text-[#c5a059] mt-0.5">
                        {formatCurrency(inspectedBlock.amountPaid)}
                      </p>
                    </div>
                  </div>

                  {/* Date & Ref */}
                  {inspectedBlock.hasPaid && (
                    <>
                      <div className="flex gap-3">
                        <span className="p-2 bg-[#161616] text-[#c5a059]/80 border border-[#222] rounded shrink-0 flex items-center justify-center h-8 w-8">
                          <Calendar className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Last Receipt Date</span>
                          <p className="text-sm font-mono text-[#e4e3e0]/80 mt-0.5">
                            {inspectedBlock.lastPaymentDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="p-2 bg-[#161616] text-[#c5a059]/80 border border-[#222] rounded shrink-0 flex items-center justify-center h-8 w-8">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Receipt/Cheque Reference</span>
                          <p className="text-sm font-mono text-[#e4e3e0]/80 mt-0.5">
                            {inspectedBlock.reference || 'ONLINE / DIRECT TRANSFER'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!inspectedBlock.hasPaid && (
                  <div className="bg-[#221215] border border-rose-900/30 p-4 rounded text-[11px] text-rose-300 leading-relaxed mt-4">
                    <b>No transaction record found.</b> No matching receipt voucher was detected for Wing {selectedWing}, Block {inspectedBlock.block} in the active transaction logs. Send a reminder notice or add a manual ledger receipt.
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="py-16 text-center text-[#e4e3e0]/40">
                <Building className="w-8 h-8 mx-auto stroke-1 text-[#c5a059]/40 mb-3" />
                <p className="text-xs">No block selected. Select any block on the left map to audit resident logs.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
