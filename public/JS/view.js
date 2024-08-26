// Firebase와 연동하기 위해 필요한 서비스 불러오기
import { auth, db, createUserWithEmailAndPassword, setDoc, doc } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDocs, query, where, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 페이지 섹션 이동에 관한 이벤트 리스너
document.addEventListener("DOMContentLoaded", () => {
    const pages = document.querySelectorAll('.page');
    const headers = document.querySelectorAll('.page-header');
    const links = document.querySelectorAll('a');
    const navbar = document.querySelector('nav');
    const backButton = document.querySelector('.back_button');
    const navLoginLink = document.querySelector('nav a[data-link="login"]'); // login 링크 선택

    let previousPages = [];

    // 초기 페이지와 헤더 설정
    showPage('home'); // 기본적으로 첫 페이지를 표시

    // 모든 링크에 클릭 이벤트 리스너 추가
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // 클릭된 링크의 data-link 속성 값을 가져옴
            const targetPage = link.getAttribute('data-link');

            // 현재 활성화된 페이지를 히스토리에 추가
            const currentPage = document.querySelector('.page.active');
            if (currentPage && currentPage.id !== targetPage) {
                previousPages.push(currentPage.id);
            }

            // 해당 페이지와 헤더 표시
            showPage(targetPage);
        });
    });

    backButton.addEventListener('click', () => {
        if (previousPages.length > 0) {
            const previousPage = previousPages.pop(); // 이전 페이지로 돌아감
            showPage(previousPage);
        } else {
            console.log('No previous pages in history.'); // 히스토리에 이전 페이지가 없는 경우 처리
        }
    });

    function showPage(pageId) {
        // 모든 페이지와 헤더의 active 클래스를 제거
        pages.forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });

        headers.forEach(header => {
            header.classList.remove('active');
            header.style.display = 'none';
        });

        // 선택된 페이지와 헤더만 표시 및 active 클래스 추가
        const activePage = document.getElementById(pageId);
        const activeHeader = document.getElementById(pageId + '-header');
        if (activePage) {
            activePage.style.display = 'flex'; // 페이지를 flex로 표시
            activePage.classList.add('active'); // active 클래스 추가
        }
        if (activeHeader) {
            activeHeader.style.display = 'flex'; // 헤더를 flex로 표시
            activeHeader.classList.add('active'); // active 클래스 추가

            // 로그인 상태에 따라 UI 업데이트
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // 로그인 상태라면 login 링크 숨기기
                    if (navLoginLink) {
                        navLoginLink.style.display = 'none';
                    }

                    // 모든 헤더에 로그아웃 버튼 추가
                    headers.forEach(header => {
                        if (!header.querySelector('#logoutButton')) {
                            const logoutButton = document.createElement('button');
                            logoutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>';
                            logoutButton.id = 'logoutButton';
                            header.appendChild(logoutButton);

                            // 로그아웃 버튼 클릭 시 로그아웃 처리
                            logoutButton.addEventListener('click', async () => {
                                try {
                                    await signOut(auth);
                                    alert('로그아웃 되었습니다.');
                                    window.location.reload();  // 현재 페이지 리로드
                                } catch (error) {
                                    console.error('로그아웃 실패:', error);
                                    alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
                                }
                            });
                        }
                    });
                } else {
                    // 로그아웃 상태라면 login 링크 보이기
                    if (navLoginLink) {
                        navLoginLink.style.display = 'block';
                    }
                }
            });
        }

        // 네비게이션 바 제어: dPage 클래스가 있는 페이지에서는 네비게이션 바를 숨김
        if (activePage && activePage.classList.contains('dPage')) {
            navbar.style.display = 'none'; // dPage 페이지에서 네비게이션 바 숨기기
        } else {
            navbar.style.display = 'flex'; // 다른 페이지에서는 네비게이션 바 보이기
        }
    }
});

// 회원가입 폼 유효성 검증 및 Firebase 연동 이벤트 리스너
document.getElementById('signUpForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 동작을 방지

    // 입력된 값 가져오기
    const name = document.getElementById('signUp_name').value.trim();
    const email = document.getElementById('signUp_email').value.trim();
    const nickName = document.getElementById('signUp_nickName').value.trim();
    const password = document.getElementById('signUp_password').value.trim();
    const passwordCheck = document.getElementById('signUp_password_check').value.trim();

    // 유효성 검사
    if (name.length < 2) {
        alert('이름은 최소 2자 이상이어야 합니다.');
        return;
    }

    if (!validateEmail(email)) {
        alert('유효한 이메일 주소를 입력해주세요.');
        return;
    }

    if (nickName.length < 3) {
        alert('닉네임은 최소 3자 이상이어야 합니다.');
        return;
    }

    if (password.length < 7) {
        alert('비밀번호는 최소 7자 이상이어야 합니다.');
        return;
    }

    if (password !== passwordCheck) {
        alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
    }

    // Firebase Auth로 회원가입 처리 및 Firestore에 사용자 정보 저장
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            nickName: nickName,
            createdAt: new Date()
        });

        alert('회원가입이 완료되었습니다!');
        window.location.href = '../index.html'; // 회원가입 후 리다이렉션
    } catch (error) {
        console.error('회원가입 실패:', error.code, error.message);
        alert('회원가입에 실패했습니다: ' + error.message);
    }
});

// 이메일 형식 검사 함수
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// 로그인 폼 제출 처리
document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // 기본 폼 제출 동작 방지

    const email = document.getElementById('userEmail').value.trim(); // 이메일 필드
    const password = document.getElementById('userPw').value.trim(); // 비밀번호 필드

    try {
        // Firebase Authentication을 사용하여 로그인 처리
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        alert('로그인 성공!');
        window.location.href = 'index.html'; // 로그인 후 이동할 페이지

    } catch (error) {
        console.error('로그인 실패:', error.code, error.message);
        alert('로그인에 실패했습니다: ' + error.message);
    }
});