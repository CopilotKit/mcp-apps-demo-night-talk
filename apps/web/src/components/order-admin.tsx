"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { ArrowDown, Drop, MagnifyingGlass, Plus, Truck, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NEIGHBORHOODS, ORDER_STATUSES, type Neighborhood, type Order } from "@/lib/map-app";

const ALL_ORDERS = "All orders";
const VIEWS = [ALL_ORDERS, ...ORDER_STATUSES];

function newOrder(): Order {
  return {
    id: `FIZZ-${Math.floor(1000 + Math.random() * 9000)}`,
    name: "", area: "SoMa", status: "Packing", flavor: "Meeting-Free Lime", cases: 12, color: "blue",
    ...NEIGHBORHOODS.SoMa,
  };
}

// Interaction and table layout inspired by shadcn/ui's Tasks example.
export function OrderAdmin({ records, onChange, portalContainer, shippingOrderIds = [] }: {
  records: Order[]; onChange: (records: Order[]) => void; portalContainer: HTMLElement | null; shippingOrderIds?: string[];
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState(ALL_ORDERS);
  const [ascending, setAscending] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ order: Order; isNew: boolean } | null>(null);

  const inView = (row: Order, name: string) => name === ALL_ORDERS || row.status === name;
  const filtered = records
    .filter(row => inView(row, view) && `${row.id} ${row.name} ${row.flavor} ${row.area}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id));
  const filtering = Boolean(search) || view !== ALL_ORDERS;
  const allVisibleSelected = filtered.length > 0 && filtered.every(row => selected.includes(row.id));

  function toggleAll(checked: boolean) {
    const visibleIds = filtered.map(row => row.id);
    setSelected(checked ? [...new Set([...selected, ...visibleIds])] : selected.filter(id => !visibleIds.includes(id)));
  }
  function toggle(id: string, checked: boolean) {
    setSelected(checked ? [...selected, id] : selected.filter(value => value !== id));
  }
  function markSelectedShipped() {
    onChange(records.map(row => selected.includes(row.id) ? { ...row, status: "Shipping" } : row));
    setSelected([]);
  }
  function save(order: Order, isNew: boolean) {
    onChange(isNew ? [...records, order] : records.map(row => row.id === order.id ? order : row));
    setEditing(null);
  }

  return <div className="crm">
    <div className="crm-title">
      <div><h1>Sparkling water orders</h1><p>Serious software for unserious water.</p></div>
      <Button onClick={() => setEditing({ order: newOrder(), isNew: true })}><Plus /> New order</Button>
    </div>
    <div className="crm-views" aria-label="Order views">
      {VIEWS.map(name => <button key={name} aria-pressed={view === name} onClick={() => setView(name)}>
        {name}<span>{records.filter(row => inView(row, name)).length}</span>
      </button>)}
    </div>
    <div className="crm-toolbar">
      <div className="crm-search"><MagnifyingGlass /><Input aria-label="Search orders" placeholder="Filter orders…" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <span>San Francisco</span>
      {filtering && <Button variant="ghost" onClick={() => { setSearch(""); setView(ALL_ORDERS); }}>Reset <X /></Button>}
    </div>
    <div className="crm-table-wrap">
      <table className="crm-table">
        <thead><tr>
          <th><input type="checkbox" aria-label="Select all visible orders" checked={allVisibleSelected} onChange={e => toggleAll(e.target.checked)} /></th>
          <th><button onClick={() => setAscending(!ascending)}>Order <ArrowDown style={{ transform: ascending ? "none" : "rotate(180deg)" }} /></button></th>
          <th>Status</th><th>Flavor</th><th>Destination</th><th />
        </tr></thead>
        <tbody>
          {filtered.map(row => <OrderRow key={row.id} row={row} selected={selected.includes(row.id)} shipping={shippingOrderIds.includes(row.id)}
            onSelect={checked => toggle(row.id, checked)} onEdit={() => setEditing({ order: { ...row }, isNew: false })} />)}
          {!filtered.length && <tr><td colSpan={6} className="crm-empty">No matching orders. The bubbles remain calm.</td></tr>}
        </tbody>
      </table>
    </div>
    {selected.length > 0 && <div className="crm-table-footer"><Button variant="outline" size="sm" onClick={markSelectedShipped}>Mark shipped</Button></div>}
    <OrderDialog editing={editing} portalContainer={portalContainer} onChange={order => setEditing(editing && { ...editing, order })} onSave={save} onClose={() => setEditing(null)} />
  </div>;
}

function OrderRow({ row, selected, shipping, onSelect, onEdit }: {
  row: Order; selected: boolean; shipping: boolean; onSelect: (checked: boolean) => void; onEdit: () => void;
}) {
  return <tr data-selected={selected} data-shipping={shipping || undefined}>
    <td><input type="checkbox" aria-label={`Select ${row.id}`} checked={selected} onChange={e => onSelect(e.target.checked)} /></td>
    <td><button className="crm-company" onClick={onEdit}><span className="crm-company-icon"><Drop weight="fill" /></span><span>{row.id}<small>{row.name} · {row.cases} cases</small></span></button></td>
    <td className="crm-status-cell">
      <span className={`crm-badge ${row.status.toLowerCase()}`}><i />{row.status}</span>
      {shipping && <span className="shipment-flight" role="status" aria-label={`${row.id} is shipping`}><span className="shipment-bubbles" aria-hidden="true">•••</span><Truck size={17} weight="fill" aria-hidden="true" /></span>}
    </td>
    <td>{row.flavor}</td>
    <td className="crm-location">{row.area}</td>
    <td><Button variant="ghost" size="sm" aria-label={`Edit ${row.id}`} onClick={onEdit}>Edit</Button></td>
  </tr>;
}

function OrderDialog({ editing, portalContainer, onChange, onSave, onClose }: {
  editing: { order: Order; isNew: boolean } | null; portalContainer: HTMLElement | null;
  onChange: (order: Order) => void; onSave: (order: Order, isNew: boolean) => void; onClose: () => void;
}) {
  const order = editing?.order;
  const update = (patch: Partial<Order>) => order && onChange({ ...order, ...patch });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const trimmed = { ...editing.order, name: editing.order.name.trim(), flavor: editing.order.flavor.trim() };
    if (trimmed.name && trimmed.flavor) onSave(trimmed, editing.isNew);
  }
  return <Dialog.Root open={Boolean(editing)} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal container={portalContainer}>
      <Dialog.Overlay className="crm-dialog-overlay" />
      <Dialog.Content className="crm-dialog">
        <Dialog.Title>{editing?.isNew ? "Add a fizzy order" : `Edit ${order?.id}`}</Dialog.Title>
        <Dialog.Description>Order details and the destination sent to the map.</Dialog.Description>
        {order && <form onSubmit={submit}>
          <label>Retailer<Input autoFocus required maxLength={80} value={order.name} onChange={e => update({ name: e.target.value })} /></label>
          <label>Status<select aria-label="Status" value={order.status} onChange={e => update({ status: e.target.value })}>
            {ORDER_STATUSES.map(status => <option key={status}>{status}</option>)}
          </select></label>
          <label>Flavor<Input required maxLength={50} value={order.flavor} onChange={e => update({ flavor: e.target.value })} /></label>
          <label>Cases<Input aria-label="Cases" type="number" min={1} max={999} value={order.cases} onChange={e => update({ cases: Number(e.target.value) })} /></label>
          <label>Destination<select aria-label="Destination" value={order.area} onChange={e => {
            const area = e.target.value as Neighborhood;
            update({ area, ...NEIGHBORHOODS[area] });
          }}>
            {Object.keys(NEIGHBORHOODS).map(area => <option key={area}>{area}</option>)}
          </select></label>
          <div className="crm-dialog-actions">
            <Dialog.Close asChild><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
            <Button type="submit">Save order</Button>
          </div>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
