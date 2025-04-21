// Define the props the component accepts
// It needs the darkMode state from the parent component to apply correct styling

import { DisclaimerProps } from "@/helpers/types";
const Disclaimer: React.FC<DisclaimerProps> = ({ darkMode }) => {
  // Determine text color classes based on the darkMode prop
  const textColorClass = darkMode ? "text-gray-400" : "text-gray-600";
  const headingColorClass = darkMode ? "text-gray-300" : "text-gray-700";

  return (
    // Container div for the entire disclaimer.
    // Applies general styling like centering and text size.
    <div className="text-center mt-8 text-sm">
      {/* Disclaimer Heading */}
      <p className={`font-semibold mb-2 ${headingColorClass}`}>
        Σημαντική Σημείωση:
      </p>

      {/* Paragraph about AI Nature and Accuracy */}
      <p className={`${textColorClass} mb-2`}>
        Η παρούσα εφαρμογή χρησιμοποιεί μοντέλα Τεχνητής Νοημοσύνης (AI) για την
        παραγωγή μεταφράσεων μεταξύ Νέων και Αρχαίων Ελληνικών.
        <br />
        Οι απαντήσεις που παράγονται είναι αποτέλεσμα αυτοματοποιημένης
        επεξεργασίας και, παρότι καταβάλλεται προσπάθεια για ακρίβεια,{" "}
        <strong>
          δεν είναι εγγυημένο ότι είναι πάντοτε απόλυτα σωστές, πλήρεις ή
          κατάλληλες για κάθε πλαίσιο
        </strong>
        . Η ποιότητα της μετάφρασης μπορεί να ποικίλλει ανάλογα με την
        πολυπλοκότητα του κειμένου και τον επιλεγμένο πάροχο AI.
      </p>

      {/* Paragraph about Data Handling (Local Storage) */}
      <p className={`${textColorClass} mb-2`}>
        <strong>Διαχείριση Δεδομένων:</strong> Σημειώνεται ότι το κείμενο που
        εισάγετε επεξεργάζεται προσωρινά για την παροχή της υπηρεσίας. Το
        ιστορικό των μεταφράσεων αποθηκεύεται{" "}
        <strong>αποκλειστικά στον δικό σας υπολογιστή</strong> (στο πρόγραμμα
        περιήγησης, χρησιμοποιώντας την τοπική αποθήκευση/localStorage) και{" "}
        <strong>δεν αποστέλλεται, αποθηκεύεται ή συσχετίζεται</strong> με
        κανέναν τρόπο με τους servers της εφαρμογής, τους παρόχους AI (εκτός της
        προσωρινής επεξεργασίας για την απάντηση) ή τρίτους.
      </p>

      {/* Paragraph about Educational Purpose */}
      <p className={`${textColorClass}`}>
        Η εφαρμογή αυτή προορίζεται να λειτουργήσει ως ένα{" "}
        <strong>βοηθητικό εργαλείο</strong> για την κατανόηση και την προσέγγιση
        κειμένων.{" "}
        <strong>
          Δεν έχει σε καμία περίπτωση σκοπό να υποκαταστήσει εκπαιδευτικούς
          σκοπούς, τη διδασκαλία από εκπαιδευτικούς, τα φροντιστήρια, ή την
          επίσημη εκπαιδευτική διαδικασία γενικότερα.
        </strong>
        <br />
        Για την ορθή εκμάθηση, την εις βάθος κατανόηση και την πιστοποιημένη
        γνώση της Ελληνικής γλώσσας (Νέας και Αρχαίας), παρακαλούμε απευθυνθείτε
        σε καταρτισμένους εκπαιδευτικούς και αξιόπιστες εκπαιδευτικές πηγές.
      </p>
    </div>
  );
};

export default Disclaimer;
