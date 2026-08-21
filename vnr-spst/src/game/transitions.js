const DICE_ROTATIONS = {
  1: [1440, 1440],
  2: [1350, 1440],
  3: [1440, 1350],
  4: [1440, 1530],
  5: [1530, 1440],
};

export function rotationForDiceValue(value) {
  return DICE_ROTATIONS[value] || [1440, 1440];
}

export function nextTeamIndex(currentIndex, teamCount) {
  if (!Number.isInteger(teamCount) || teamCount <= 0) return 0;
  const normalizedIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
  return ((normalizedIndex % teamCount) + teamCount + 1) % teamCount;
}

function cloneTeams(teams) {
  return teams.map((team) => ({ ...team }));
}

export function applyDiceScore(teams, teamIndex, diceValue, subtract = false) {
  const team = teams[teamIndex];
  if (!team) return cloneTeams(teams);

  const value = Math.max(0, Number(diceValue) || 0);
  const score = subtract ? Math.max(0, team.score - value) : team.score + value;
  return teams.map((item, index) =>
    index === teamIndex ? { ...item, score } : { ...item }
  );
}

export const addDiceScore = (teams, teamIndex, diceValue) =>
  applyDiceScore(teams, teamIndex, diceValue);

export const subtractDiceScore = (teams, teamIndex, diceValue) =>
  applyDiceScore(teams, teamIndex, diceValue, true);

export function loseAllScore(teams, teamIndex) {
  if (!teams[teamIndex]) return cloneTeams(teams);
  return teams.map((team, index) =>
    index === teamIndex ? { ...team, score: 0 } : { ...team }
  );
}

export function resetScores(teams) {
  return teams.map((team) => ({ ...team, score: 0 }));
}

// thiefIndex is the team that drew the effect and gains points; victimIndex
// is the Host-chosen team that loses them, capped by the victim's own score
// (GAMEPLAY.md: "Nếu đội bị cướp có ít hơn 5 điểm → lấy hết").
export function stealUpToFive(teams, thiefIndex, victimIndex) {
  const thief = teams[thiefIndex];
  const victim = teams[victimIndex];
  if (!thief || !victim || thiefIndex === victimIndex) return cloneTeams(teams);

  const amount = Math.min(5, Math.max(0, victim.score));
  return teams.map((team, index) => {
    if (index === thiefIndex) return { ...team, score: team.score + amount };
    if (index === victimIndex) return { ...team, score: team.score - amount };
    return { ...team };
  });
}

export function swapScores(teams, firstTeamIndex, secondTeamIndex) {
  const firstTeam = teams[firstTeamIndex];
  const secondTeam = teams[secondTeamIndex];
  if (!firstTeam || !secondTeam || firstTeamIndex === secondTeamIndex) {
    return cloneTeams(teams);
  }

  return teams.map((team, index) => {
    if (index === firstTeamIndex) return { ...team, score: secondTeam.score };
    if (index === secondTeamIndex) return { ...team, score: firstTeam.score };
    return { ...team };
  });
}

export function closeCard(state, teams, winnerIndex) {
  const activeCardNum = state.active_card_num;
  const usedCardNumbers = Array.isArray(state.used_card_numbers)
    ? [...state.used_card_numbers]
    : [];
  if (Number.isInteger(activeCardNum) && !usedCardNumbers.includes(activeCardNum)) {
    usedCardNumbers.push(activeCardNum);
  }

  const deck = Array.isArray(state.card_deck) ? state.card_deck : [];
  const allCardsUsed =
    deck.length > 0 && deck.every((card) => usedCardNumbers.includes(card.num));
  const currentTeamIndex = Number.isInteger(state.answering_team_idx)
    ? state.answering_team_idx
    : 0;
  const nextSelectorIndex = Number.isInteger(winnerIndex)
    ? winnerIndex
    : nextTeamIndex(currentTeamIndex, teams.length);
  const nextSelector = teams[nextSelectorIndex];

  return {
    ...state,
    phase: allCardsUsed ? "finished" : "selecting_card",
    used_card_numbers: usedCardNumbers,
    active_card_num: null,
    attempt_order: [],
    attempt_idx: 0,
    answering_team_idx: nextSelectorIndex,
    answering_team_key: nextSelector?.team_key ?? nextSelector?.id ?? null,
    answer_submission_team_key: null,
    option_states: [],
    attempt_label: "",
    deadline_at: null,
    show_explain: false,
    show_effect: false,
    effect_type: null,
    effect_icon: null,
    effect_label: null,
    effect_desc: null,
    effect_team_idx: null,
    effect_result: null,
    show_eff_continue: false,
    eff_body_buttons: null,
    show_dice: false,
    dice_rolling: false,
    dice_value: null,
    dice_result_visible: false,
    revision: (Number(state.revision) || 0) + 1,
  };
}
