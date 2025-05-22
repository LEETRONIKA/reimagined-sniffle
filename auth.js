// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged as firebaseOnAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
    GoogleAuthProvider,
    GithubAuthProvider,
    FacebookAuthProvider,
    TwitterAuthProvider,
    signInWithPopup,
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator,
    RecaptchaVerifier,
    signInWithCredential
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDstv-9UHv57LD6SXh-C1nEA9SWtCFigns",
  authDomain: "clashofcoders-af0de.firebaseapp.com",
  projectId: "clashofcoders-af0de",
  storageBucket: "clashofcoders-af0de.appspot.com",
  messagingSenderId: "656219752398",
  appId: "1:656219752398:web:ffb0fdd9c0421f2ca1cd9f",
  measurementId: "G-X478ZDD0X1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const twitterProvider = new TwitterAuthProvider();

// Initialize reCAPTCHA
function initRecaptcha() {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
            // reCAPTCHA solved
        }
    });
}

// Authentication functions
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
            return { success: false, message: 'Please verify your email first' };
        }
        return { success: true, user: userCredential.user };
    } catch (error) {
        let message = 'Login failed';
        switch(error.code) {
            case 'auth/invalid-email': message = 'Invalid email format'; break;
            case 'auth/user-not-found': message = 'User not found'; break;
            case 'auth/wrong-password': message = 'Incorrect password'; break;
        }
        return { success: false, message };
    }
}

export async function signup(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        return { 
            success: true, 
            message: 'Verification email sent! Please check your inbox',
            user: userCredential.user 
        };
    } catch (error) {
        let message = 'Signup failed';
        switch(error.code) {
            case 'auth/email-already-in-use': message = 'Email already in use'; break;
            case 'auth/invalid-email': message = 'Invalid email format'; break;
            case 'auth/weak-password': message = 'Password should be at least 6 characters'; break;
        }
        return { success: false, message };
    }
}

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
        return { success: false, message: 'Failed to send reset email' };
    }
}

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, message: 'Google sign-in failed' };
    }
}

export async function signInWithGithub() {
    try {
        const result = await signInWithPopup(auth, githubProvider);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, message: 'GitHub sign-in failed' };
    }
}

export async function signInWithFacebook() {
    try {
        const result = await signInWithPopup(auth, facebookProvider);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, message: 'Facebook sign-in failed' };
    }
}

export async function signInWithTwitter() {
    try {
        const result = await signInWithPopup(auth, twitterProvider);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, message: 'Twitter sign-in failed' };
    }
}

// Phone Authentication
export async function startPhoneAuth(phoneNumber) {
    try {
        initRecaptcha();
        const provider = new PhoneAuthProvider(auth);
        const verificationId = await provider.verifyPhoneNumber(
            phoneNumber, 
            window.recaptchaVerifier
        );
        return { success: true, verificationId };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export async function verifyPhoneCode(verificationId, code) {
    try {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        const result = await signInWithCredential(auth, credential);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// 2-Factor Authentication
export async function enrollSecondFactor(phoneNumber) {
    try {
        initRecaptcha();
        const multiFactorSession = await multiFactor(auth.currentUser).getSession();
        const phoneInfoOptions = {
            phoneNumber,
            session: multiFactorSession
        };
        
        const provider = new PhoneAuthProvider(auth);
        const verificationId = await provider.verifyPhoneNumber(
            phoneInfoOptions, 
            window.recaptchaVerifier
        );
        
        return { success: true, verificationId };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export async function verifySecondFactor(verificationId, code) {
    try {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
        await multiFactor(auth.currentUser).enroll(multiFactorAssertion);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

export function setupAuthStateListener(callback) {
    return firebaseOnAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            
            // Load profile data
            import('./profile.js').then(({ loadProfile }) => loadProfile());
        } else {
            // User is signed out
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('app-content').style.display = 'none';
        }
        callback(user);
    });
}

export { auth, db };