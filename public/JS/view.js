// Firebase와 연동하기 위해 필요한 서비스 불러오기
import { auth, db, createUserWithEmailAndPassword, setDoc, doc } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDocs, query, where, collection, getDoc, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 전역 변수
let previousPages = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeApp(); // 전체 앱 초기화
});

// 전체 앱 초기화를 위한 함수
function initializeApp() {
    initPageNavigation();  // 페이지 네비게이션 초기화
    initPostManagement();  // 게시글 관리 초기화
    initSearchFeature();   // 게시글 검색 기능 초기화
    initPagination();      // 페이지네이션 초기화
    initAuthForms();       // 로그인 및 회원가입 폼 초기화
}

// 전역에 정의된 함수들
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    const headers = document.querySelectorAll('.page-header');
    const navbar = document.querySelector('nav');

    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    headers.forEach(header => {
        header.classList.remove('active');
        header.style.display = 'none';
    });

    const activePage = document.getElementById(pageId);
    const activeHeader = document.getElementById(pageId + '-header');

    if (activePage) {
        activePage.style.display = 'flex';
        activePage.classList.add('active');
    }
    if (activeHeader) {
        activeHeader.style.display = 'flex';
        activeHeader.classList.add('active');
        handleAuthState(activeHeader, document.querySelector('nav a[data-link="login"]'));
    }

    // 네비게이션 바 제어
    navbar.style.display = activePage && activePage.classList.contains('dPage') ? 'none' : 'flex';
}

function handleAuthState(activeHeader, navLoginLink) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            navLoginLink && (navLoginLink.style.display = 'none');

            if (!activeHeader.querySelector('#logoutButton')) {
                const logoutButton = document.createElement('button');
                logoutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>';
                logoutButton.id = 'logoutButton';
                activeHeader.appendChild(logoutButton);

                logoutButton.addEventListener('click', async () => {
                    try {
                        await signOut(auth);
                        alert('로그아웃 되었습니다.');
                        window.location.reload();
                    } catch (error) {
                        console.error('로그아웃 실패:', error);
                        alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
                    }
                });
            }
        } else {
            navLoginLink && (navLoginLink.style.display = 'block');
        }
    });
}

function handlePageLinkClick(e) {
    e.preventDefault();
    const targetPage = e.target.closest('a').getAttribute('data-link');
    const currentPage = document.querySelector('.page.active');
    if (currentPage && currentPage.id !== targetPage) {
        previousPages.push(currentPage.id);
    }
    showPage(targetPage);
}

function handleBackButtonClick() {
    if (previousPages.length > 0) {
        const previousPage = previousPages.pop();
        showPage(previousPage);
    } else {
        console.log('No previous pages in history.');
    }
}

// 페이지 네비게이션 초기화 함수
function initPageNavigation() {
    const links = document.querySelectorAll('a[data-link]');
    const backButton = document.querySelectorAll('.back_button');

    // 초기 페이지 설정
    showPage('home');

    // 링크 클릭 시 페이지 이동 처리
    links.forEach(link => {
        link.addEventListener('click', handlePageLinkClick);
    });

    backButton.forEach(button => {
        button.addEventListener('click', handleBackButtonClick);
    });
}

// 회원가입 폼 초기화 함수
function initAuthForms() {
    document.getElementById('signUpForm').addEventListener('submit', handleSignUpFormSubmit);
}

// 회원가입 폼 제출 처리 함수
async function handleSignUpFormSubmit(event) {
    event.preventDefault(); // 기본 폼 제출 동작을 방지

    // 입력된 값 가져오기
    const name = document.getElementById('signUp_name').value.trim();
    const email = document.getElementById('signUp_email').value.trim();
    const nickName = document.getElementById('signUp_nickName').value.trim();
    const password = document.getElementById('signUp_password').value.trim();
    const passwordCheck = document.getElementById('signUp_password_check').value.trim();

    // 유효성 검사
    if (!validateSignUpForm(name, email, nickName, password, passwordCheck)) {
        return;
    }

    // Firebase Auth로 회원가입 처리 및 Firestore에 사용자 정보 저장
    try {
        // 사용자 계정 생성 (로그인 처리 없이 사용자 계정만 생성)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            nickName: nickName,
            createdAt: new Date()
        });

        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        showPage('home'); // 회원가입 후 로그인 페이지로 리다이렉션
    } catch (error) {
        console.error('회원가입 실패:', error.code, error.message);
        alert('회원가입에 실패했습니다: ' + error.message);
    }
}

// 유효성 검사 함수
function validateSignUpForm(name, email, nickName, password, passwordCheck) {
    if (name.length < 2) {
        alert('이름은 최소 2자 이상이어야 합니다.');
        return false;
    }

    if (!validateEmail(email)) {
        alert('유효한 이메일 주소를 입력해주세요.');
        return false;
    }

    if (nickName.length < 3) {
        alert('닉네임은 최소 3자 이상이어야 합니다.');
        return false;
    }

    if (password.length < 7) {
        alert('비밀번호는 최소 7자 이상이어야 합니다.');
        return false;
    }

    if (password !== passwordCheck) {
        alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return false;
    }

    return true;
}

// 이메일 형식 검사 함수
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// 로그인 폼 제출 처리 함수
async function handleLoginFormSubmit(event) {
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
}

// 게시글 검색 기능에 관한 스크립트
function initSearchFeature() {
    document.getElementById('postSearchButton').addEventListener('click', function () {
        const searchQuery = document.getElementById('postSearchInput').value.trim().toLowerCase();
        filterPosts(searchQuery);
    });

    document.getElementById('postSearchInput').addEventListener('keyup', function (event) {
        const searchQuery = document.getElementById('postSearchInput').value.trim().toLowerCase();
        filterPosts(searchQuery);
    });
}
function filterPosts(query) {
    const postItems = document.querySelectorAll('.postItem');
    postItems.forEach(item => {
        const title = item.querySelector('.postTitle').textContent.toLowerCase();

        if (title.includes(query)) {
            item.style.display = 'flex';  // 검색어에 해당하면 표시
        } else {
            item.style.display = 'none';  // 검색어에 해당하지 않으면 숨김
        }
    });
}

// 게시글 페이지네이션 스크립트
function initPagination() {
    const postsPerPage = 7;

    // Firebase Firestore에서 게시글을 불러와 페이지네이션 처리
    async function fetchPosts() {
        // Firestore에서 createdAt 필드를 기준으로 최신순으로 정렬하여 가져옴
        const querySnapshot = await getDocs(query(collection(db, 'guestRoomPosts'), orderBy('createdAt', 'desc')));
        const allPosts = [];

        querySnapshot.forEach(doc => {
            const post = doc.data();
            allPosts.push({
                title: post.title,
                date: new Date(post.createdAt.toDate()).toLocaleDateString(),
            });
        });

        return allPosts;
    }

    function createPaginator(posts) {
        let currentPage = 1;

        function renderPosts(page) {
            const postList = document.querySelector('.postList');
            postList.innerHTML = '';

            const start = (page - 1) * postsPerPage;
            const end = Math.min(page * postsPerPage, posts.length); // 마지막 인덱스를 posts.length로 제한

            const paginatedPosts = posts.slice(start, end);

            paginatedPosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.classList.add('postItem');
                postItem.innerHTML = `
                    <h3 class="postTitle">${post.title}</h3>
                    <p class="postDate">${post.date}</p>
                `;
                postList.appendChild(postItem);
            });

            // 페이지 번호 업데이트
            document.getElementById('postsCurrentPageIndicator').textContent = page;

            // 이전, 다음 버튼 상태 업데이트
            updatePaginationButtons(page, posts.length);
        }

        function updatePaginationButtons(page, totalPosts) {
            const prevButton = document.getElementById('postsPrevPageButton');
            const nextButton = document.getElementById('postsNextPageButton');

            // 이전 버튼 상태 업데이트
            if (page === 1) {
                prevButton.style.display = 'none'; // 첫 페이지에서는 이전 버튼 숨김
            } else {
                prevButton.style.display = 'inline-block'; // 첫 페이지가 아니면 이전 버튼 표시
            }

            // 다음 버튼 상태 업데이트
            if (page * postsPerPage >= totalPosts) {
                nextButton.style.display = 'none'; // 마지막 페이지에서는 다음 버튼 숨김
            } else {
                nextButton.style.display = 'inline-block'; // 마지막 페이지가 아니면 다음 버튼 표시
            }
        }

        return {
            init: function () {
                renderPosts(currentPage);

                document.querySelector('.pagination').addEventListener('click', (event) => {
                    if (event.target.closest('#postsPrevPageButton') && currentPage > 1) {
                        currentPage--;
                        renderPosts(currentPage);
                    } else if (event.target.closest('#postsNextPageButton') && currentPage * postsPerPage < posts.length) {
                        currentPage++;
                        renderPosts(currentPage);
                    }
                });

                // 초기 버튼 상태 설정
                updatePaginationButtons(currentPage, posts.length);
            }
        };
    }

    // 페이지네이션 초기화
    fetchPosts().then(allPosts => {
        const paginator = createPaginator(allPosts);
        paginator.init();
    }).catch(error => {
        console.error('게시글을 불러오는 중 오류 발생:', error);
    });
}

// 게시글 작성 폼의 제출 함수
function initPostManagement() {
    document.getElementById('postWriteForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const title = document.getElementById('postTitle').value.trim();
        const password = document.getElementById('postPassword').value.trim();
        const content = document.getElementById('postContent').value.trim();

        if (password.length !== 4) {
            alert('비밀번호는 4자리 숫자로 입력해야 합니다.');
            return;
        }

        try {
            const user = auth.currentUser;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const nickname = userData.nickName;

                await addDoc(collection(db, 'guestRoomPosts'), {
                    title: title,
                    content: content,
                    authorId: user.uid,
                    authorNickname: nickname,
                    password: btoa(password),
                    createdAt: new Date()
                });

                alert('게시글이 작성되었습니다!');
                showPage('guestRoom');  // guestRoom 페이지로 이동

                // 게시글 목록 갱신
                loadPosts();  // 게시글 목록을 다시 불러옴
                initPagination();  // 페이지네이션을 다시 설정
            } else {
                alert('사용자 정보가 없습니다.');
            }
        } catch (error) {
            console.error('게시글 작성 실패:', error);
            alert('게시글 작성에 실패했습니다.');
        }
    });
}


// 게시글 목록을 로드하는 함수
async function loadPosts() {
    const postListElement = document.querySelector('.postList');
    postListElement.innerHTML = ''; // 기존 목록 초기화

    // Firestore에서 createdAt 필드를 기준으로 최신순으로 정렬하여 가져옴
    const querySnapshot = await getDocs(query(collection(db, 'guestRoomPosts'), orderBy('createdAt', 'desc')));

    querySnapshot.forEach((doc) => {
        const post = doc.data();
        const postItem = document.createElement('div');
        postItem.classList.add('postItem');

        postItem.innerHTML = `
            <h3 class="postTitle">${post.title}</h3>
            <p class="postDate">${new Date(post.createdAt.toDate()).toLocaleDateString()}</p>
        `;

        postListElement.appendChild(postItem);
    });
}