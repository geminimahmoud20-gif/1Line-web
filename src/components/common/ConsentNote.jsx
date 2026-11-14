import './consent-note.css';

/**
 * One line under a form's send button: sending the form means the team may contact the client on the number given,
 * with a link to the privacy page. Shown on every form that collects a name and phone.
 */
export default function ConsentNote({ isAr = true }) {
  return (
    <p className="consent-note">
      {isAr
        ? <>بالضغط على إرسال، بتوافق إن فريق 1Line يتواصل معاك على الرقم ده بخصوص طلبك فقط. <a href="/privacy" target="_blank" rel="noopener">سياسة الخصوصية</a></>
        : <>By sending, you agree that the 1Line team may contact you on this number about your request only. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></>}
    </p>
  );
}
