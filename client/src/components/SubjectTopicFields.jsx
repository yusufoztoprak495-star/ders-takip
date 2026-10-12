// Ders ve (isteğe bağlı) konu seçim alanları. Durum useSubjectSelection kancasından gelir.
// showTopic={false} ile yalnızca ders seçilir (örn. kaynaklar derse bağlıdır, konuya değil).
export default function SubjectTopicFields({ selection, showTopic = true }) {
  const { subjects, subject, subjectId, topicId, selectSubject, selectTopic } = selection;
  return (
    <>
      <label>
        Ders
        <select value={subjectId} onChange={(e) => selectSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.examType})
            </option>
          ))}
        </select>
      </label>
      {showTopic && (
        <label>
          Konu (isteğe bağlı)
          <select value={topicId} onChange={(e) => selectTopic(e.target.value)}>
            <option value="">Konu seçme</option>
            {subject?.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
