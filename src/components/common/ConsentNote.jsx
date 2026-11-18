import './consent-note.css';

/**
 * One line under a form's send button: sending the form means the team may contact the client on the number given,
 * with a link to the privacy page. Shown on every form that collects a name and phone.
 */
export default function ConsentNote({ isAr = true, auto = false }) {
  return (
    <p className="consent-note">
      {auto
        ? (isAr
          ? <>هنبعت طلبك تلقائيًا أول ما تخلّص بياناتك (وتقدر توقّفه قبل ما يتبعت)، وبتوافق إن فريق 1Line يتواصل معاك على الرقم ده بخصوص طلبك فقط. <a href="/privacy" target="_blank" rel="noopener">سياسة الخصوصية</a></>
          : <>Your request is sent automatically once your details are complete (you can stop it before it goes), and you agree the 1Line team may contact you on this number about your request only. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></>)
        : isAr
        ? <>بالضغط على إرسال، بتوافق إن فريق 1Line يتواصل معاك على الرقم ده بخصوص طلبك فقط. <a href="/privacy" target="_blank" rel="noopener">سياسة الخصوصية</a></>
        : <>By sending, you agree that the 1Line team may contact you on this number about your request only. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></>}
    </p>
  );
}
