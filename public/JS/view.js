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
    const paginator = initPagination(); // 페이지네이션 초기화
    paginator.init(); // 페이지네이션 시작
    initAuthForms();       // 로그인 및 회원가입 폼 초기화
    initAuthStateHandling(); // 인증 상태 관리 초기화
}

// 페이지 전환 처리 함수
function showPage(pageId, data = null) {
    const pages = document.querySelectorAll('.page');
    const headers = document.querySelectorAll('.page-header');
    const navbar = document.querySelector('nav');

    // 현재 사용자 인증 상태 확인
    const user = auth.currentUser;

    // 비회원이 접근할 수 없는 페이지 처리
    const restrictedPages = ['postWrite', 'postDetail'];
    if (!user && restrictedPages.includes(pageId)) {
        alert('이 페이지는 회원만 접근할 수 있습니다.');
        return showPage('login'); // 비회원은 로그인 페이지로 리다이렉트
    }

    updatePreviousPages(pageId);

    hideAllElements(pages);
    hideAllElements(headers);

    const activePage = document.getElementById(pageId);
    const activeHeader = document.getElementById(pageId + '-header');

    if (activePage) {
        activateElement(activePage, 'flex');
        // 데이터가 전달되었고, 현재 페이지가 postDetail일 경우 처리
        if (pageId === 'postDetail' && data && data.id) {
            loadPostDetail(data.id);  // 게시글 ID로 상세 정보 로드
        }
    }
    if (activeHeader) {
        activateElement(activeHeader, 'flex');
    }

    // 네비게이션 바 제어
    navbar.style.display = activePage && activePage.classList.contains('dPage') ? 'none' : 'flex';
}

// 이전 페이지를 스택에 추가하는 함수
function updatePreviousPages(pageId) {
    const currentPage = document.querySelector('.page.active');
    if (currentPage && currentPage.id !== pageId) {
        previousPages.push(currentPage.id);
        console.log(`Page added to stack: ${currentPage.id}`);
    }
}

// 모든 요소를 숨기는 함수
function hideAllElements(elements) {
    elements.forEach(element => {
        element.classList.remove('active');
        element.style.display = 'none';
    });
}

// 특정 요소를 활성화하는 함수
function activateElement(element, displayStyle = 'block') {
    element.style.display = displayStyle;
    element.classList.add('active');
}

// 인증 상태 처리 함수
function initAuthStateHandling() {
    const headers = document.querySelectorAll('.page-header');
    const navLoginLink = document.querySelector('nav a[data-link="login"]');

    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user); // 인증 상태가 변경될 때마다 로그 출력

        if (user) {
            console.log('User is logged in');
            if (navLoginLink) {
                navLoginLink.style.display = 'none'; // 로그인 상태라면 로그인 링크 숨기기
            }

            headers.forEach(header => {
                if (!header.querySelector('#logoutButton')) {
                    createLogoutButton(header);
                }
            });
        } else {
            console.log('User is logged out');
            if (navLoginLink) {
                navLoginLink.style.display = 'block'; // 로그아웃 상태라면 로그인 링크 보이기
            }

            headers.forEach(header => {
                removeLogoutButton(header);
            });
        }
    });
}

// 로그아웃 버튼 생성 함수
function createLogoutButton(header) {
    const logoutButton = document.createElement('button');
    logoutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>';
    logoutButton.id = 'logoutButton';
    header.appendChild(logoutButton);

    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            alert('로그아웃 되었습니다.');
            showPage('login'); // 로그아웃 후 login 페이지로 이동
        } catch (error) {
            console.error('로그아웃 실패:', error);
            alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
        }
    });
}

// 로그아웃 버튼 제거 함수
function removeLogoutButton(header) {
    const logoutButton = header.querySelector('#logoutButton');
    if (logoutButton) {
        logoutButton.remove(); // 로그아웃 상태라면 기존 로그아웃 버튼 제거
    }
}

// 링크 클릭 처리 함수
function handlePageLinkClick(e) {
    e.preventDefault();
    const targetPage = e.target.closest('a').getAttribute('data-link');
    showPage(targetPage);
}

// 백버튼 처리 함수
function handleBackButtonClick() {
    if (previousPages.length > 0) {
        const previousPage = previousPages.pop();
        showPage(previousPage);
    } else {
        showPage('home'); // 스택이 비어있을 경우 기본 페이지로 이동
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

    // 백버튼 클릭 시 이전 페이지로 이동 처리
    backButton.forEach(button => {
        button.addEventListener('click', handleBackButtonClick);
    });
}

// 로그인 및 회원가입 폼 초기화 함수
function initAuthForms() {
    const signUpForm = document.getElementById('signUpForm');
    const loginForm = document.getElementById('loginForm');

    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUpFormSubmit);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginFormSubmit);
    }
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
        // 사용자 계정 생성
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
        showPage('home'); // 회원가입 후 홈 페이지로 이동
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
        showPage('home'); // 로그인 후 홈 페이지로 이동

    } catch (error) {
        console.error('로그인 실패:', error.code, error.message);
        alert('로그인에 실패했습니다: ' + error.message);
    }
}

// 게시글 검색 기능에 관한 스크립트
function initSearchFeature() {
    const searchButton = document.getElementById('postSearchButton');
    const searchInput = document.getElementById('postSearchInput');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            filterPosts(searchInput.value.trim().toLowerCase());
        });

        searchInput.addEventListener('keyup', () => {
            filterPosts(searchInput.value.trim().toLowerCase());
        });
    }
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

// 게시글 항목을 생성하는 공통 함수
function createPostItem(post) {
    const postItem = document.createElement('div');
    postItem.classList.add('postItem');
    postItem.innerHTML = `
        <h3 class="postTitle">${post.title}</h3>
        <p class="postDate">${post.date}</p>
    `;

    // 게시글 클릭 시 상세보기 페이지로 이동
    postItem.addEventListener('click', () => {
        showPage('postDetail', { id: post.id }); // postDetail 페이지로 이동하면서 게시글 ID를 전달
    });

    return postItem;
}

// 게시글 페이지네이션 스크립트
function initPagination() {
    const postsPerPage = 7;
    let allPosts = []; // 전체 게시글 데이터를 저장할 변수

    async function renderPosts(page) {
        const postList = document.querySelector('.postList');
        postList.innerHTML = '';

        // Firestore에서 데이터를 불러옴 (처음 한 번만 호출되도록 변경)
        if (allPosts.length === 0) {
            const querySnapshot = await getDocs(query(collection(db, 'guestRoomPosts'), orderBy('createdAt', 'desc')));
            querySnapshot.forEach(doc => {
                allPosts.push({
                    id: doc.id,
                    title: doc.data().title,
                    date: new Date(doc.data().createdAt.toDate()).toLocaleDateString()
                });
            });
        }

        const start = (page - 1) * postsPerPage;
        const end = Math.min(page * postsPerPage, allPosts.length);

        const paginatedPosts = allPosts.slice(start, end);

        paginatedPosts.forEach(post => {
            const postItem = createPostItem(post);
            postList.appendChild(postItem);
        });

        // 페이지 번호 업데이트
        document.getElementById('postsCurrentPageIndicator').textContent = page;

        // 이전, 다음 버튼 상태 업데이트
        updatePaginationButtons(page, allPosts.length);
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
            let currentPage = 1;

            renderPosts(currentPage);

            document.querySelector('.pagination').addEventListener('click', (event) => {
                if (event.target.closest('#postsPrevPageButton') && currentPage > 1) {
                    currentPage--;
                    renderPosts(currentPage);
                } else if (event.target.closest('#postsNextPageButton') && currentPage * postsPerPage < allPosts.length) {
                    currentPage++;
                    renderPosts(currentPage);
                }
            });
        }
    };
}

// 게시글 작성 폼의 제출 함수
function initPostManagement() {
    const postWriteForm = document.getElementById('postWriteForm');
    
    if (postWriteForm) {
        postWriteForm.addEventListener('submit', async function (event) {
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
                    const paginator = initPagination();  // 페이지네이션을 다시 설정
                    paginator.init();
                } else {
                    alert('사용자 정보가 없습니다.');
                }
            } catch (error) {
                console.error('게시글 작성 실패:', error);
                alert('게시글 작성에 실패했습니다.');
            }
        });
    }
}

// 게시글 로드 페이지
async function loadPostDetail(postId) {
    try {
        const postDoc = await getDoc(doc(db, 'guestRoomPosts', postId));
        if (postDoc.exists()) {
            const post = postDoc.data();
            // 상세 페이지 요소에 데이터 채우기
            document.getElementById('postDetailTitleText').textContent = post.title;
            document.getElementById('postAuthorNickname').textContent = post.authorNickname;
            document.getElementById('postDateText').textContent = new Date(post.createdAt.toDate()).toLocaleDateString();
            document.getElementById('postContentWrapper').innerHTML = `<p>${post.content}</p>`;
        } else {
            alert('게시글을 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        alert('게시글을 로드하는 데 실패했습니다.');
    }
}