import { Link } from 'react-router-dom';
import { subjectLabel } from '../lib/tracks.js';

// Ders ve (isteğe bağlı) konu seçim alanları. Durum useSubjectSelection kancasından gelir.
// showTopic={false} ile yalnızca ders seçilir (örn. kaynaklar derse bağlıdır, konuya değil).
export default function SubjectTopicFields({ selection, showTopic = true }) {
  const { subjects, subject, subjectId, topicId, selectSubject, selectTopic, loaded } = selection;
  // Üniversite hedefinde başta hiç ders yoktur: boş bir seçim kutusu yerine ne yapılacağı söylenir
  if (loaded && subjects.length === 0) {
    return (
      <p className="notice">
        Bu hedefte henüz ders yok. <Link to="/konular">Dersler ve Konular</Link> sayfasından ilk
        dersini ekle.
      </p>
    );
  }
  return (
    <>
      <label>
        Ders
        <select value={subjectId} onChange={(e) => selectSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectLabel(s.name, s.examType)}
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
