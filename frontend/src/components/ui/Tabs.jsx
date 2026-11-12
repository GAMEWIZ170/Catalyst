import { useId, useRef } from "react";

// Accessible tabs. Left and Right arrows, Home and End move between tabs (roving tabindex).
// tabs: [{ id, label, panel }]. Controlled: value + onChange.
export default function Tabs({ tabs, value, onChange, label }) {
  const base = useId();
  const refs = useRef({});

  function onKeyDown(event, index) {
    const last = tabs.length - 1;
    const keys = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = tabs[keys[event.key]];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div className="ui-tabs">
      <div className="ui-tablist" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => { refs.current[tab.id] = node; }}
            role="tab"
            type="button"
            id={`${base}-tab-${tab.id}`}
            aria-selected={value === tab.id}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={value === tab.id ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >{tab.label}</button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`${base}-panel-${tab.id}`} aria-labelledby={`${base}-tab-${tab.id}`} hidden={value !== tab.id} className="ui-tabpanel" tabIndex={0}>
          {value === tab.id ? tab.panel : null}
        </div>
      ))}
    </div>
  );
}
