// Tüm dersler, her birinin konularıyla birlikte
export function listSubjects({ state }) {
  const subjects = [...state.subjects].sort((a, b) => a.id - b.id);
  const topics = [...state.topics].sort((a, b) => a.id - b.id);
  return {
    status: 200,
    body: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      examType: s.examType,
      topics: topics
        .filter((t) => t.subjectId === s.id)
        .map((t) => ({ id: t.id, name: t.name })),
    })),
  };
}
