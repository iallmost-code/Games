// Historical combat/navigation bots use world-axis joystick vectors. Pin the real
// Settings preference to Classic; action-rpg.cjs covers projected screen-space input.
module.exports=source=>source.replace('<script>','<script>\ntry{localStorage.setItem("ember-crypt-rpg-preview","0");}catch{}');
