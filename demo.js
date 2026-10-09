import { createRoster } from './shared/roster.js';
import { mountParty } from './shared/party-frame.js';
function show(size) {
  const party = createRoster(1, Infinity, { size });
  mountParty(document.querySelector('#party'), party)(party);
}
document.querySelector('#five').onclick = () => show(5);
document.querySelector('#ten').onclick = () => show(10);
show(5);
