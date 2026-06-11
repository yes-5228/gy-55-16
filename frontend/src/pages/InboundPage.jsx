import { CalendarCheck, PackagePlus, RefreshCw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { parcelsApi, reservationsApi, lockersApi } from "../api/modules";
import DataTable from "../components/DataTable";
import MessageBox from "../components/MessageBox";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const initialInbound = {
  tracking_no: "",
  sender_name: "",
  receiver_name: "",
  receiver_phone: "",
  carrier: "顺丰",
  size: "medium",
  reservation_id: "",
  note: "",
};

const initialReservation = {
  courier_name: "",
  courier_phone: "",
  size: "medium",
  zone: "",
  expire_hours: 24,
  note: "",
};

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString("zh-CN", { hour12: false });
}

export default function InboundPage() {
  const [tab, setTab] = useState("reservation");
  const [inboundForm, setInboundForm] = useState(initialInbound);
  const [reservationForm, setReservationForm] = useState(initialReservation);
  const [parcels, setParcels] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [zones, setZones] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [availCount, setAvailCount] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const loadParcels = () => parcelsApi.list().then(setParcels);
  const loadReservations = () => reservationsApi.active().then(setReservations);
  const loadZones = () => lockersApi.zones().then(setZones);

  useEffect(() => {
    loadParcels();
    loadReservations();
    loadZones();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAvailLoading(true);
    const params = { size: reservationForm.size };
    if (reservationForm.zone) params.zone = reservationForm.zone;
    lockersApi
      .availability(params)
      .then((cells) => {
        if (!cancelled) {
          setAvailCount(cells.length);
          setAvailLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailCount(null);
          setAvailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reservationForm.size, reservationForm.zone]);

  const updateInbound = (event) => {
    setInboundForm({ ...inboundForm, [event.target.name]: event.target.value });
  };

  const updateReservation = (event) => {
    setReservationForm({ ...reservationForm, [event.target.name]: event.target.value });
  };

  const clearMsg = () => {
    setMessage("");
    setError("");
  };

  const submitReservation = async (event) => {
    event.preventDefault();
    clearMsg();
    if (availCount === 0) {
      setError("当前条件下没有可用空柜，请更换尺寸或分区后再试。");
      return;
    }
    try {
      const payload = { ...reservationForm };
      if (!payload.zone) delete payload.zone;
      const created = await reservationsApi.create(payload);
      setMessage(`预约成功，柜格 ${created.locker_cell_detail.code}，有效期至 ${formatDateTime(created.expires_at)}。`);
      setReservationForm(initialReservation);
      loadReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmCancel = (id) => {
    setConfirming(id);
  };

  const doCancel = async () => {
    const id = confirming;
    setConfirming(null);
    clearMsg();
    try {
      await reservationsApi.cancel(id);
      setMessage("预约已取消。");
      loadReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const useReservation = (r) => {
    setInboundForm({
      ...inboundForm,
      reservation_id: String(r.id),
      size: r.size,
    });
    setTab("inbound");
  };

  const submitInbound = async (event) => {
    event.preventDefault();
    clearMsg();
    try {
      const payload = { ...inboundForm };
      if (!payload.reservation_id) delete payload.reservation_id;
      else payload.reservation_id = Number(payload.reservation_id);
      const created = await parcelsApi.inbound(payload);
      setMessage(`入库成功，柜格 ${created.locker_cell_detail.code}，取件码 ${created.pickup_code}。`);
      setInboundForm(initialInbound);
      loadParcels();
      loadReservations();
    } catch (err) {
      setError(err.message);
    }
  };

  const clearReservationSelection = () => {
    setInboundForm({ ...inboundForm, reservation_id: "", size: "medium" });
  };

  const availHint = () => {
    if (availLoading) return { type: "info", text: "正在查询空柜..." };
    if (availCount === null) return null;
    if (availCount === 0) {
      return {
        type: "error",
        text: `当前条件下（${reservationForm.size === "small" ? "小" : reservationForm.size === "medium" ? "中" : "大"}柜${reservationForm.zone ? ` · ${reservationForm.zone}` : ""}）没有可用空柜，请更换尺寸或分区。`,
      };
    }
    return {
      type: "success",
      text: `当前条件下（${reservationForm.size === "small" ? "小" : reservationForm.size === "medium" ? "中" : "大"}柜${reservationForm.zone ? ` · ${reservationForm.zone}` : ""}）还有 ${availCount} 个空柜可预约。`,
    };
  };

  return (
    <>
      <PageHeader title="快件入库" description="提前预约柜格锁定空柜，到货时使用预约快速入柜。" />
      <div className="tabs">
        <button className={tab === "reservation" ? "active" : ""} onClick={() => { setTab("reservation"); clearMsg(); }}>
          <CalendarCheck size={16} />预约柜格
        </button>
        <button className={tab === "inbound" ? "active" : ""} onClick={() => { setTab("inbound"); clearMsg(); }}>
          <PackagePlus size={16} />快件入库
        </button>
      </div>
      <MessageBox type="success">{message}</MessageBox>
      <MessageBox type="error">{error}</MessageBox>

      {tab === "reservation" && (
        <section className="work-grid">
          <form className="panel form-panel" onSubmit={submitReservation}>
            <h2>新建预约</h2>
            <label>快递员姓名<input name="courier_name" value={reservationForm.courier_name} onChange={updateReservation} required /></label>
            <label>快递员电话<input name="courier_phone" value={reservationForm.courier_phone} onChange={updateReservation} required /></label>
            <label>
              柜格尺寸
              <select name="size" value={reservationForm.size} onChange={updateReservation}>
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </label>
            <label>
              分区（可选）
              <select name="zone" value={reservationForm.zone} onChange={updateReservation}>
                <option value="">自动分配</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </label>
            {(() => {
              const h = availHint();
              if (!h) return null;
              return (
                <div className={`hint ${h.type}`}>
                  {h.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{h.text}</span>
                </div>
              );
            })()}
            <label>
              有效期（小时）
              <input type="number" name="expire_hours" min={1} max={72} value={reservationForm.expire_hours} onChange={updateReservation} required />
            </label>
            <label>备注<input name="note" value={reservationForm.note} onChange={updateReservation} /></label>
            <button type="submit" disabled={availCount === 0}>
              <CalendarCheck size={18} />{availCount === 0 ? "暂无可预约柜格" : "锁定柜格"}
            </button>
          </form>
          <section className="panel">
            <div className="panel-title">
              <h2>有效预约列表</h2>
              <button className="ghost" onClick={() => { loadReservations(); clearMsg(); }}><RefreshCw size={16} />刷新</button>
            </div>
            {confirming && (
              <div className="confirm-dialog">
                <div className="confirm-box">
                  <p><AlertTriangle size={20} /> 确认取消此预约吗？取消后柜格将被释放，操作不可撤销。</p>
                  <div className="confirm-actions">
                    <button className="ghost" onClick={() => setConfirming(null)}>取消</button>
                    <button className="danger-btn" onClick={doCancel}>确认取消</button>
                  </div>
                </div>
              </div>
            )}
            <DataTable
              rows={reservations}
              columns={[
                { key: "id", title: "预约号" },
                { key: "courier_name", title: "快递员" },
                { key: "cell", title: "柜格", render: (row) => row.locker_cell_detail?.code },
                { key: "zone", title: "分区", render: (row) => row.locker_cell_detail?.zone },
                { key: "size", title: "尺寸", render: (row) => row.size_label },
                { key: "expires_at", title: "过期时间", render: (row) => formatDateTime(row.expires_at) },
                { key: "status", title: "状态", render: (row) => <StatusBadge status={row.status} label={row.status_label} /> },
                {
                  key: "actions",
                  title: "操作",
                  render: (row) => (
                    <div className="row-actions">
                      <button className="ghost" onClick={() => useReservation(row)}><PackagePlus size={15} />使用入库</button>
                      <button className="ghost danger" onClick={() => confirmCancel(row.id)}><X size={15} />取消</button>
                    </div>
                  ),
                },
              ]}
            />
          </section>
        </section>
      )}

      {tab === "inbound" && (
        <section className="work-grid">
          <form className="panel form-panel" onSubmit={submitInbound}>
            <h2>入库登记</h2>
            {inboundForm.reservation_id ? (
              <div className="hint">
                使用预约号 <strong>{inboundForm.reservation_id}</strong> 入库，尺寸已锁定。
                <button type="button" className="link" onClick={clearReservationSelection}>清除预约</button>
              </div>
            ) : null}
            <label>运单号<input name="tracking_no" value={inboundForm.tracking_no} onChange={updateInbound} required /></label>
            <label>寄件方<input name="sender_name" value={inboundForm.sender_name} onChange={updateInbound} required /></label>
            <label>收件人<input name="receiver_name" value={inboundForm.receiver_name} onChange={updateInbound} required /></label>
            <label>手机号<input name="receiver_phone" value={inboundForm.receiver_phone} onChange={updateInbound} required /></label>
            <label>承运商<input name="carrier" value={inboundForm.carrier} onChange={updateInbound} required /></label>
            <label>
              预约号（可选）
              <select name="reservation_id" value={inboundForm.reservation_id} onChange={updateInbound}>
                <option value="">不使用预约</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} - {r.locker_cell_detail?.code} ({r.courier_name})
                  </option>
                ))}
              </select>
            </label>
            {!inboundForm.reservation_id && (
              <label>
                柜格尺寸
                <select name="size" value={inboundForm.size} onChange={updateInbound}>
                  <option value="small">小</option>
                  <option value="medium">中</option>
                  <option value="large">大</option>
                </select>
              </label>
            )}
            <label>备注<input name="note" value={inboundForm.note} onChange={updateInbound} /></label>
            <button type="submit"><PackagePlus size={18} />确认入库</button>
          </form>
          <section className="panel">
            <div className="panel-title">
              <h2>快件列表</h2>
              <button className="ghost" onClick={() => { loadParcels(); clearMsg(); }}><RefreshCw size={16} />刷新</button>
            </div>
            <DataTable
              rows={parcels}
              columns={[
                { key: "tracking_no", title: "运单号" },
                { key: "receiver_name", title: "收件人" },
                { key: "cell", title: "柜格", render: (row) => row.locker_cell_detail?.code },
                { key: "pickup_code", title: "取件码" },
                { key: "status", title: "状态", render: (row) => <StatusBadge status={row.status} label={row.status_label} /> },
              ]}
            />
          </section>
        </section>
      )}
    </>
  );
}
