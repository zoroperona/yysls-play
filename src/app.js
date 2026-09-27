import {
  DEFAULT_STATE,
  SKILLS,
  SKILL_GROUPS,
  STAT_META,
  calculateComparison,
  deepClone,
} from "./model.js?v=37b4c61acea4";

const STORAGE_KEY = "yysls-dps-simulator-v1";

const formatNumber = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
function mergeState(saved) {
  const fallback = deepClone(DEFAULT_STATE);
  if (!saved || typeof saved !== "object") return fallback;
  const savedPanel = { ...(saved.panel ?? {}) };
  if (Number.isFinite(Number(savedPanel.elementalAttack))) {
    if (savedPanel.nativeElementMin == null) savedPanel.nativeElementMin = Number(savedPanel.elementalAttack);
    if (savedPanel.nativeElementMax == null) savedPanel.nativeElementMax = Number(savedPanel.elementalAttack);
  }
  delete savedPanel.elementalAttack;
  const savedSeasonValues = { ...(saved.season?.values ?? {}) };
  if (Number.isFinite(Number(savedSeasonValues.elementalAttack))) {
    if (savedSeasonValues.nativeElementMin == null) {
      savedSeasonValues.nativeElementMin = Number(savedSeasonValues.elementalAttack);
    }
    if (savedSeasonValues.nativeElementMax == null) {
      savedSeasonValues.nativeElementMax = Number(savedSeasonValues.elementalAttack);
    }
  }
  delete savedSeasonValues.elementalAttack;
  const savedAffixes = Array.isArray(saved.affixes) ? saved.affixes.flatMap((affix) => {
    if (affix.stat !== "elementalAttack") return [affix];
    return [
      { ...affix, id: `${affix.id}-native-min`, stat: "nativeElementMin" },
      { ...affix, id: `${affix.id}-native-max`, stat: "nativeElementMax" },
    ];
  }) : fallback.affixes;
  const legacyRotation = saved.rotation && typeof saved.rotation.umbrella !== "object"
    ? {
        umbrella: { normal: saved.rotation.umbrellaNormal ?? 50, stagger: saved.rotation.umbrellaStagger ?? 26 },
        snap: { normal: saved.rotation.snapNormal ?? 3, stagger: saved.rotation.snapStagger ?? 1 },
      }
    : {};
  const rotation = Object.fromEntries(Object.keys(SKILLS).map((skillId) => [
    skillId,
    {
      ...fallback.rotation[skillId],
      ...legacyRotation[skillId],
      ...(saved.rotation?.[skillId] && typeof saved.rotation[skillId] === "object" ? saved.rotation[skillId] : {}),
    },
  ]));
  const skillOverrides = Object.fromEntries(Object.keys(SKILLS).map((skillId) => [
    skillId,
    { ...fallback.skillOverrides[skillId], ...saved.skillOverrides?.[skillId] },
  ]));
  return {
    ...fallback,
    ...saved,
    panel: { ...fallback.panel, ...savedPanel },
    rotation,
    skillOverrides,
    effects: {
      ...fallback.effects,
      ...saved.effects,
      lossSoul: { ...fallback.effects.lossSoul, ...saved.effects?.lossSoul },
    },
    model: { ...fallback.model, ...saved.model },
    season: {
      ...fallback.season,
      ...saved.season,
      values: { ...fallback.season.values, ...savedSeasonValues },
    },
    affixes: savedAffixes,
  };
}

function loadState() {
  try {
    return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return deepClone(DEFAULT_STATE);
  }
}

let state = loadState();
let saveTimer;

const byId = (id) => document.getElementById(id);
const numericValue = (input) => Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;

function saveState() {
  byId("autosaveStatus").textContent = "保存中…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    byId("autosaveStatus").textContent = "已自动保存";
  }, 180);
}

function statOptions(selected) {
  return Object.entries(STAT_META).map(([key, meta]) =>
    `<option value="${key}" ${key === selected ? "selected" : ""}>${meta.label}</option>`,
  ).join("");
}

function renderAffixes() {
  const list = byId("affixList");
  list.innerHTML = state.affixes.map((affix) => `
    <div class="affix-row" data-affix-id="${affix.id}">
      <label class="affix-control">
        <span>词条</span>
        <select data-affix-field="stat" aria-label="词条类型">${statOptions(affix.stat)}</select>
      </label>
      <label class="affix-control">
        <span>条数</span>
        <input type="number" data-affix-field="count" min="0" step="1" value="${affix.count}" aria-label="词条条数" />
      </label>
      <label class="affix-control">
        <span>单条值</span>
        <input type="number" data-affix-field="value" step="0.01" value="${affix.value}" aria-label="单条词条值" />
      </label>
      <button class="remove-affix" type="button" data-remove-affix title="移除词条" aria-label="移除词条">×</button>
    </div>
  `).join("");
  byId("affixEmpty").hidden = state.affixes.length > 0;
}

function renderSeasonValues() {
  byId("seasonValueList").innerHTML = Object.entries(STAT_META).map(([key, meta]) => `
    <label class="field with-suffix">
      <span>${meta.label}</span>
      <input type="number" data-season-value="${key}" step="0.01" value="${state.season.values[key]}" />
      ${meta.unit ? `<b>${meta.unit}</b>` : ""}
    </label>
  `).join("");
  byId("seasonNameInput").value = state.season.name;
  byId("seasonNameSummary").textContent = state.season.name;
}

function renderRotationRows() {
  byId("rotationRows").innerHTML = Object.values(SKILLS).map((skill) => {
    const rotation = state.rotation[skill.id];
    return `
      <div class="rotation-row" data-skill-id="${skill.id}">
        <span><strong>${skill.name}</strong><small>${skill.alias}</small></span>
        <input type="number" data-rotation-phase="normal" min="0" step="1" value="${rotation.normal}" aria-label="${skill.name}${skill.alias}气竭外次数" />
        <input type="number" data-rotation-phase="stagger" min="0" step="1" value="${rotation.stagger}" aria-label="${skill.name}${skill.alias}气竭内次数" />
        <output>${rotation.normal + rotation.stagger}</output>
      </div>
    `;
  }).join("");
}

function renderSkillCoefficients() {
  byId("skillCoefficientList").innerHTML = `
    <div class="coefficient-head">
      <span>技能</span><span>外倍率</span><span>外固伤</span><span>破竹倍率</span><span>破竹固伤</span><span>独立伤害</span>
    </div>
    ${Object.values(SKILLS).map((skill) => {
      const values = state.skillOverrides[skill.id];
      return `
        <div class="coefficient-row" data-coefficient-skill="${skill.id}">
          <span><strong>${skill.name}</strong><small>${skill.alias}</small></span>
          <input type="number" data-coefficient="externalRatio" step="0.0001" value="${values.externalRatio}" aria-label="${skill.name}外功倍率" />
          <input type="number" data-coefficient="externalFlat" step="1" value="${values.externalFlat}" aria-label="${skill.name}外功固伤" />
          <input type="number" data-coefficient="elementalRatio" step="0.0001" value="${values.elementalRatio}" aria-label="${skill.name}破竹倍率" />
          <input type="number" data-coefficient="elementalFlat" step="1" value="${values.elementalFlat}" aria-label="${skill.name}破竹固伤" />
          <input type="number" data-coefficient="directDamage" step="1" value="${values.directDamage}" aria-label="${skill.name}独立单次伤害" />
        </div>
      `;
    }).join("")}
  `;
}

function renderPanelDelta(comparison) {
  const deltas = Object.entries(STAT_META).map(([key, meta]) => {
    const delta = comparison.adjustedPanel[key] - state.panel[key];
    if (Math.abs(delta) < 0.0001) return "";
    const sign = delta > 0 ? "+" : "";
    return `<span class="delta-chip ${delta > 0 ? "positive" : ""}">${meta.label} ${sign}${delta.toFixed(meta.decimals)}${meta.unit}</span>`;
  }).filter(Boolean);
  byId("panelDelta").innerHTML = deltas.length ? deltas.join("") : '<span class="delta-chip">面板无变化</span>';
}

function setText(id, value) { byId(id).textContent = value; }

function renderSkillBreakdown(adjusted) {
  const activeGroups = Object.entries(SKILL_GROUPS)
    .map(([key, meta]) => ({ key, ...meta, damage: adjusted.groupTotals[key] ?? 0 }))
    .filter((item) => item.damage > 0);
  const items = activeGroups.length ? activeGroups : [{ key: "none", label: "暂无技能伤害", color: "#777", damage: 0 }];
  byId("skillBreakdownList").innerHTML = items.map((item) => {
    const share = adjusted.total > 0 ? item.damage / adjusted.total * 100 : 0;
    return `
      <div class="breakdown-item">
        <div><span>${item.label}</span><strong>${formatNumber.format(item.damage)}</strong></div>
        <div class="bar-track"><i style="width:${Math.min(100, share)}%;background:${item.color}"></i></div>
        <small>${share.toFixed(1)}%</small>
      </div>
    `;
  }).join("");
}

function renderResults() {
  const comparison = calculateComparison(state);
  const { adjusted, baseline } = comparison;
  setText("adjustedDps", formatNumber.format(adjusted.dps));
  setText("baselineDps", `${formatNumber.format(baseline.dps)} DPS`);
  setText("comparisonDps", `${formatNumber.format(adjusted.dps)} DPS`);
  setText("totalDamage", formatNumber.format(adjusted.total));
  setText("gainPercent", `${comparison.gainPercent >= 0 ? "+" : ""}${comparison.gainPercent.toFixed(2)}%`);
  setText("gainDps", `${comparison.gain >= 0 ? "+" : ""}${formatNumber.format(comparison.gain)} DPS`);
  renderSkillBreakdown(adjusted);
  setText("normalDamage", formatNumber.format(adjusted.normalTotal));
  setText("staggerDamage", formatNumber.format(adjusted.staggerTotal));
  setText("externalDamage", formatNumber.format(adjusted.channelTotals.external));
  setText("nativeElementDamage", formatNumber.format(adjusted.channelTotals.nativeElement));
  setText("foreignElementDamage", formatNumber.format(adjusted.channelTotals.foreignElement));
  setText("directDamage", formatNumber.format(adjusted.channelTotals.direct));
  setText("grazeProbability", `${(adjusted.probabilities.graze * 100).toFixed(1)}%`);
  setText("normalProbability", `${(adjusted.probabilities.normal * 100).toFixed(1)}%`);
  setText("critProbability", `${(adjusted.probabilities.crit * 100).toFixed(1)}%`);
  setText("insightProbability", `${(adjusted.probabilities.insight * 100).toFixed(1)}%`);
  renderPanelDelta(comparison);
}

function syncInputs() {
  document.querySelectorAll("[data-panel]").forEach((input) => { input.value = state.panel[input.dataset.panel]; });
  document.querySelectorAll("[data-model]").forEach((input) => { input.value = state.model[input.dataset.model]; });
  byId("durationInput").value = state.duration;
  byId("lossSoulEnabled").checked = state.effects.lossSoul.enabled;
  byId("lossSoulUptime").value = state.effects.lossSoul.uptime;
}

function update() {
  renderResults();
  saveState();
}

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.matches("[data-panel]")) state.panel[input.dataset.panel] = numericValue(input);
  if (input.matches("[data-model]")) state.model[input.dataset.model] = numericValue(input);
  if (input.id === "durationInput") state.duration = Math.max(1, numericValue(input));
  if (input.id === "lossSoulUptime") state.effects.lossSoul.uptime = Math.min(100, Math.max(0, numericValue(input)));
  if (input.id === "seasonNameInput") {
    state.season.name = input.value;
    byId("seasonNameSummary").textContent = input.value || "未命名模板";
  }
  if (input.matches("[data-season-value]")) state.season.values[input.dataset.seasonValue] = numericValue(input);

  const rotationRow = input.closest("[data-skill-id]");
  if (rotationRow && input.matches("[data-rotation-phase]")) {
    const skillId = rotationRow.dataset.skillId;
    state.rotation[skillId][input.dataset.rotationPhase] = Math.max(0, numericValue(input));
    rotationRow.querySelector("output").textContent = state.rotation[skillId].normal + state.rotation[skillId].stagger;
  }

  const coefficientRow = input.closest("[data-coefficient-skill]");
  if (coefficientRow && input.matches("[data-coefficient]")) {
    const skillId = coefficientRow.dataset.coefficientSkill;
    state.skillOverrides[skillId][input.dataset.coefficient] = numericValue(input);
  }

  const affixRow = input.closest("[data-affix-id]");
  if (affixRow && input.matches("[data-affix-field]")) {
    const affix = state.affixes.find((item) => item.id === affixRow.dataset.affixId);
    if (affix) affix[input.dataset.affixField] = input.dataset.affixField === "stat" ? input.value : numericValue(input);
  }
  update();
});

document.addEventListener("change", (event) => {
  const select = event.target;
  if (select.id === "lossSoulEnabled") {
    state.effects.lossSoul.enabled = select.checked;
    update();
    return;
  }
  if (!select.matches('[data-affix-field="stat"]')) return;
  const row = select.closest("[data-affix-id]");
  const affix = state.affixes.find((item) => item.id === row.dataset.affixId);
  if (!affix) return;
  affix.stat = select.value;
  affix.value = state.season.values[select.value] ?? 0;
  renderAffixes();
  update();
});

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-affix]");
  if (removeButton) {
    const row = removeButton.closest("[data-affix-id]");
    state.affixes = state.affixes.filter((item) => item.id !== row.dataset.affixId);
    renderAffixes();
    update();
  }
});

byId("addAffixButton").addEventListener("click", () => {
  state.affixes.push({
    id: globalThis.crypto?.randomUUID?.() ?? `affix-${Date.now()}`,
    stat: "maxAttack",
    count: 1,
    value: state.season.values.maxAttack,
  });
  renderAffixes();
  update();
});

byId("resetButton").addEventListener("click", () => {
  state = deepClone(DEFAULT_STATE);
  syncInputs();
  renderRotationRows();
  renderSkillCoefficients();
  renderAffixes();
  renderSeasonValues();
  update();
});

byId("exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `燕云DPS配置-${state.season.name || "未命名"}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

syncInputs();
renderRotationRows();
renderSkillCoefficients();
renderAffixes();
renderSeasonValues();
renderResults();
