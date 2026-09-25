import test from "node:test";
import assert from "node:assert/strict";
import { runSimulation } from "../utils/combatEngine.ts";

test("simulation exposes finisher and stamina state for a realistic matchup", () => {
  const a = {
    id: "a",
    name: "Solar Titan",
    species: "Human",
    powers: ["solar", "radiant", "flight"],
    skills: ["combat", "veteran", "tactician"],
    weaknesses: ["shadow", "cold"],
    equipment: ["gauntlets"],
    personality: "calculating and relentless",
    positiveTraits: "adaptable, disciplined",
    negativeTraits: "overconfident",
    battlePhilosophy: "pressure and control",
    majorAbilities: "solar blasts",
    secondaryAbilities: "speed burst",
    signatureTechniques: "nova barrage",
    physicalAppearance: "golden armor",
    occupation: "champion",
  };

  const b = {
    id: "b",
    name: "Void Reaver",
    species: "Alien",
    powers: ["shadow", "void", "gravity"],
    skills: ["martial", "counter", "stealth"],
    weaknesses: ["light", "radiant"],
    equipment: ["blade"],
    personality: "cold and precise",
    positiveTraits: "calm, adaptive",
    negativeTraits: "stubborn",
    battlePhilosophy: "counterpuncher",
    majorAbilities: "shadow chains",
    secondaryAbilities: "phase step",
    signatureTechniques: "gravity crush",
    physicalAppearance: "black armor",
    occupation: "hunter",
  };

  const result = runSimulation(
    [a as any, b as any],
    null,
    {
      locationName: "Tokyo rooftops",
      distance: "40m",
      knowledge: "partial",
      preparation: "both",
      morals: "canon",
      conditions: "Night",
      winCondition: "Incapacitation",
    },
    12345,
  );

  assert.ok(result.finishState);
  assert.equal(typeof result.finishState.finisherName, "string");
  assert.equal(typeof result.finishState.finalBlow, "string");
  assert.equal(typeof result.finishState.loserTired, "boolean");
  assert.equal(typeof result.finishState.canContinue, "boolean");
  assert.ok(
    result.finishState.finisherName === result.combatants[0].name ||
      result.finishState.finisherName === result.combatants[1].name,
  );
});
