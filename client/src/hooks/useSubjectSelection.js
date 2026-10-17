import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";

// Ders listesini sunucudan çeker ve seçili ders/konu durumunu tutar.
// Birden fazla sayfada aynı ders ve konu seçimi gerektiği için ortak bir kancadır.
// initialSubjectId: başka bir sayfadan gelinirken önceden seçilecek ders (örn. haftalık programdaki blok)
export function useSubjectSelection(initialSubjectId = null) {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // select öğeleri metin değer verdiği için id'ler burada metin olarak tutulur
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");

  useEffect(() => {
    apiFetch("/api/subjects")
      .then((list) => {
        setSubjects(list);
        // Henüz seçim yapılmadıysa ilk ders seçili gelsin
        const wanted = list.find((s) => String(s.id) === String(initialSubjectId ?? ""));
        setSubjectId((current) => current || String((wanted ?? list[0])?.id ?? ""));
        setLoaded(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  const subject = subjects.find((s) => String(s.id) === subjectId);

  // Ders değişince konu seçimi sıfırlanır (konu seçilen derse ait olmalı)
  function selectSubject(id) {
    setSubjectId(id);
    setTopicId("");
  }

  return {
    subjects,
    subject,
    topicId,
    error,
    selectSubject,
    selectTopic: setTopicId,
    subjectId,
    loaded,
  };
}
