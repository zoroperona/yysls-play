// Stable IDs/slots; callers supply encounter-specific status text and selection.
export function mountParty(container, party, { onSelect, groupByTeam = false, heading = team => `${team} 队` } = {}) {
  container.replaceChildren();
  container.style.gridTemplateColumns = `repeat(${new Set(party.map(p => p.team)).size}, minmax(0, 1fr))`;
  const elements = new Map(), columns = new Map();
  if (groupByTeam) for (const team of [...new Set(party.map(p => p.team))].sort()) {
    const column = document.createElement('div'), title = document.createElement('div');
    column.className = 'team-column'; title.className = 'team-heading'; title.textContent = heading(team);
    column.append(title); container.append(column); columns.set(team, column);
  }
  for (const p of [...party].sort((a, b) => a.slot - b.slot || a.team - b.team)) {
    const el = document.createElement(onSelect ? "button" : "div");
    el.id = `member-${p.id}`;
    el.className = `member${p.id === 0 ? (groupByTeam ? " you" : " player") : ""}${p.healer ? " healer" : ""}${p.tank ? " tank" : ""}`;
    const row = document.createElement("span"), name = document.createElement("span"), hp = document.createElement(groupByTeam ? "b" : "small"), bar = document.createElement("progress");
    name.textContent = p.name; hp.className = "hp"; bar.max = 100; bar.value = p.hp;
    bar.setAttribute("aria-label", `${p.name}血量`);
    if (groupByTeam) { row.textContent = p.name; row.append(hp); } else row.append(name, hp);
    el.append(row, bar);
    if (onSelect) { el.type = "button"; el.onclick = () => onSelect(p.id); }
    (columns.get(p.team) ?? container).append(el); elements.set(p.id, { el, hp, bar });
  }
  return (members, { label = p => `${Math.ceil(p.hp)}`, selectable = () => false, marked = () => false } = {}) => {
    for (const p of members) {
      const { el, hp, bar } = elements.get(p.id);
      el.classList.toggle("dead", p.hp <= 0);
      el.classList.toggle("selectable", selectable(p)); el.classList.toggle("marked", marked(p));
      hp.textContent = p.hp > 0 ? label(p) : "倒地"; bar.value = p.hp;
      if (onSelect) el.disabled = !selectable(p);
    }
  };
}
