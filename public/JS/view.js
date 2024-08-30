// Firebase와 연동하기 위해 필요한 서비스 불러오기
import { auth, db, createUserWithEmailAndPassword, setDoc, doc, deleteDoc, serverTimestamp } from './firebase-config.js';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDocs, query, where, collection, getDoc, addDoc, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function setScreenSize() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`); //"--vh"라는 속성으로 정의해준다.
}

window.addEventListener('resize', () => setScreenSize());

// 전역 변수
let previousPages = [];

document.addEventListener("DOMContentLoaded", () => {
    initializeApp(); // 전체 앱 초기화
});

function initializeApp() {
    initPageNavigation();  // 페이지 네비게이션 초기화
    initPostManagement();  // 게시글 관리 초기화
    initSearchFeature();   // 게시글 검색 기능 초기화
    const paginator = initPagination(); // 페이지네이션 초기화
    paginator.init(); // 페이지네이션 시작
    initAuthForms();       // 로그인 및 회원가입 폼 초기화
    initAuthStateHandling(); // 인증 상태 관리 초기화
    initCommentSheet();
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
        alert('Restricted access: Members only. 회원만 접근할 수 있습니다.');
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
        // console.log(`Page added to stack: ${currentPage.id}`);
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
        // console.log('Auth state changed:', user); // 인증 상태가 변경될 때마다 로그 출력

        if (user) {
            console.log('User is logged in');
            if (navLoginLink) {
                navLoginLink.style.display = 'none';
            }

            headers.forEach(header => {
                if (!header.querySelector('#logoutButton')) {
                    createLogoutButton(header);
                }
            });
        } else {
            console.log('User is logged out');
            if (navLoginLink) {
                navLoginLink.style.display = 'block';
            }

            headers.forEach(header => {
                removeLogoutButton(header);
            });
        }
    });
}

// 로그아웃 버튼 생성 함수
async function createLogoutButton(header) {

    const loginAuthBox = document.createElement('div');
    loginAuthBox.className = 'loginAuthbox';

    const logoutButton = document.createElement('button');
    logoutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>Logout</span>';
    logoutButton.id = 'logoutButton';

    const welcomeMessage = document.createElement('span');
    welcomeMessage.id = 'welComeMessage';
    welcomeMessage.textContent = 'Loading...'; // 초기 로딩 메시지 설정

    loginAuthBox.appendChild(logoutButton);
    loginAuthBox.appendChild(welcomeMessage);

    header.appendChild(loginAuthBox); // 페이지 로드 직후 UI가 보이도록 추가

    // 로그인 상태 및 사용자 정보를 빠르게 확인
    const user = auth.currentUser;
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const nickname = userData.nickName;
                welcomeMessage.textContent = `${nickname}님 환영합니다!`; // 닉네임 업데이트
            } else {
                throw new Error('No user document found');
            }
        } catch (error) {
            console.error('사용자 정보를 가져오는 데 실패했습니다:', error);
            welcomeMessage.textContent = 'Unknown';
        }
    } else {
        header.removeChild(loginAuthBox); // 로그인 상태가 아닐 경우 요소 제거
    }

    // 로그아웃 버튼 이벤트 리스너
    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
        alert('로그아웃 되었습니다.');
        showPage('login'); // 로그아웃 후 login 페이지로 이동
    });
}

// 로그아웃 버튼 제거 함수
function removeLogoutButton(header) {
    const loginAuthBox = header.querySelector('.loginAuthbox');

    if (loginAuthBox) {
        loginAuthBox.remove(); // 로그아웃 상태라면 기존 <div> 제거
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

        alert('Welcome! 환영합니다!');
        showPage('home'); // 회원가입 후 홈 페이지로 이동
    } catch (error) {
        console.error('회원가입 실패:', error.code, error.message);
        alert('회원가입에 실패했습니다');
    }
}

// 유효성 검사 함수
function validateSignUpForm(name, email, nickName, password, passwordCheck) {
    if (name.length < 2) {
        alert('Name must be at least 2 characters long. 이름은 최소 2자 이상이어야 합니다.');
        return false;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address. 유효한 이메일 주소를 입력해주세요.');
        return false;
    }

    if (nickName.length < 2) {
        alert('Nickname must be at least 2 characters long. 닉네임은 최소 2자 이상이어야 합니다.');
        return false;
    }

    if (password.length < 7) {
        alert('Password must be at least 7 characters long. 비밀번호는 최소 7자 이상이어야 합니다.');
        return false;
    }

    if (password !== passwordCheck) {
        alert('Password and confirmation do not match. 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
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

        // alert('로그인 성공!');
        showPage('home'); // 로그인 후 홈 페이지로 이동

    } catch (error) {
        console.error('로그인 실패:', error.code, error.message);

        // 에러 코드에 따른 처리
        if (error.code === 'auth/wrong-password' ||
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/invalid-login-credentials') {
            alert('Incorrect email or password.\n 이메일 또는 비밀번호가 잘못되었습니다.');
        } else {
            alert('Login failed. Please try again.\n로그인에 실패했습니다. 다시 시도해주세요.');
        }
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

// 전역 변수 선언
let isEditing = false; // 수정 중인지 여부를 나타내는 플래그
let editingPostId = null; // 수정 중인 게시글의 ID
let currentPostId = null; // 현재 게시글 ID를 저장하는 변수
let commentCache = {}; // 댓글 캐싱

// 게시글 페이지네이션 스크립트
function initPagination() {
    const postsPerPage = 7;
    let allPosts = []; // 전체 게시글 데이터를 저장할 변수

    function listenForPostUpdates() {
        const postsQuery = query(collection(db, 'guestRoomPosts'), orderBy('createdAt', 'desc'));
        onSnapshot(postsQuery, (snapshot) => {
            allPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                date: new Date(doc.data().createdAt.toDate()).toLocaleDateString()
            }));
            renderPosts(1); // 첫 페이지로 게시글 렌더링
        });
    }

    async function renderPosts(page) {
        const postList = document.querySelector('.postList');
        postList.innerHTML = '';

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

        prevButton.style.display = page === 1 ? 'none' : 'inline-block';
        nextButton.style.display = page * postsPerPage >= totalPosts ? 'none' : 'inline-block';
    }

    return {
        init: function () {
            let currentPage = 1;
            listenForPostUpdates(); // 게시글 실시간 업데이트 시작
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


// 게시글 수정 및 작성 폼의 제출 함수
function initPostManagement() {
    const postWriteForm = document.getElementById('postWriteForm');
    const postWriteCancelBtn = document.getElementById('postWriteCancel');

    if (postWriteForm) {
        postWriteForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const title = document.getElementById('postTitle').value.trim();
            const content = document.getElementById('postContent').value.trim();

            if (!title || !content) {
                alert('제목과 내용을 모두 입력해야 합니다.');
                return;
            }

            try {
                const user = auth.currentUser;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();
                const nickname = userData.nickName;

                if (isEditing && editingPostId) {
                    // 기존 게시글 수정 처리
                    await setDoc(doc(db, 'guestRoomPosts', editingPostId), {
                        title: title,
                        content: content,
                        authorId: user.uid,
                        authorNickname: nickname
                    }, { merge: true });
                    alert('게시글이 수정되었습니다!');
                } else {
                    // 새 게시글 작성 처리
                    await addDoc(collection(db, 'guestRoomPosts'), {
                        title: title,
                        content: content,
                        authorId: user.uid,
                        authorNickname: nickname,
                        createdAt: new Date()
                    });
                    // alert('게시글이 작성되었습니다!');
                }

                // 폼 초기화
                postWriteForm.reset();
                isEditing = false;
                editingPostId = null;

                // 작성 후 guestRoom 페이지로 이동
                showPage('guestRoom');

            } catch (error) {
                console.error('게시글 작성 실패:', error);
                alert('Failed to create post.\n게시글 작성에 실패했습니다.');
            }

        });

        // '취소하기' 버튼 클릭 시 폼 초기화 및 페이지 이동
        postWriteCancelBtn.addEventListener('click', function () {
            if (confirm('Are you sure you want to cancel your current changes?\n작성 중인 내용을 취소하시겠습니까?')) {
                postWriteForm.reset(); // 폼 초기화
                isEditing = false;
                editingPostId = null;
                showPage('guestRoom'); // guestRoom 페이지로 이동
            }
        });
    }
}

function enableEditMode(postId) {
    // 수정 모드 설정
    isEditing = true;
    editingPostId = postId;

    // 해당 게시글의 데이터를 로드하여 폼에 채워 넣기
    loadPostDetail(postId, true);
}

// 게시글 삭제 함수
async function handleDeleteButtonClick(postId) {
    if (confirm('Are you sure you want to delete this post?\n이 게시글을 삭제하시겠습니까?')) {
        try {
            // Firestore의 실시간 업데이트 리스너 제거
            if (unsubscribeFromPostDetail) {
                unsubscribeFromPostDetail();
                unsubscribeFromPostDetail = null;
            }

            await deleteDoc(doc(db, 'guestRoomPosts', postId));
            // alert('게시글이 삭제되었습니다.');

            // 삭제 후 바로 guestRoom 페이지로 이동
            showPage('guestRoom');
        } catch (error) {
            console.error('게시글 삭제 실패:', error);
            alert('delete fail post.\n게시글 삭제에 실패했습니다.');
        }
    }
}

// 게시글을 불러오고 상세페이지를 렌더링하는 함수
let unsubscribeFromPostDetail = null; //실시간 업데이트 조건부 변수

async function loadPostDetail(postId, isEditMode = false) {
    try {
        const postDocRef = doc(db, 'guestRoomPosts', postId);

        // 기존의 리스너가 존재한다면 먼저 제거
        if (unsubscribeFromPostDetail) {
            unsubscribeFromPostDetail();
            unsubscribeFromPostDetail = null;
        }

        // Firestore의 실시간 업데이트 리스너 설정
        unsubscribeFromPostDetail = onSnapshot(postDocRef, (doc) => {
            if (doc.exists()) {
                const postData = doc.data();
                currentPostId = postId;

                if (isEditMode) {
                    fillEditForm(postData);
                } else {
                    fillPostDetailPage(postData);
                    showPage('postDetail');
                }
            } else {
                showPage('guestRoom');  // 게시글을 찾을 수 없을 때 guestRoom 페이지로 이동
            }
        });
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        alert('Failed to load the post.\n게시글을 로드하는 데 실패했습니다.');
    }
}

function fillEditForm(postData) {
    document.getElementById('postTitle').value = postData.title;
    document.getElementById('postContent').value = postData.content;
    isEditing = true;
    editingPostId = currentPostId;
    showPage('postWrite');
}

function fillPostDetailPage(postData) {
    document.getElementById('postDetailTitleText').textContent = postData.title;
    document.getElementById('postAuthorNickname').textContent = postData.authorNickname;
    document.getElementById('postDateText').textContent = new Date(postData.createdAt.toDate()).toLocaleDateString();
    document.getElementById('postContentWrapper').innerHTML = `<p>${postData.content}</p>`;

    // 댓글 리스트에 postId를 동적으로 할당
    const commentList = document.querySelector('.commentList');
    if (commentList) {
        commentList.setAttribute('data-post-id', currentPostId);
    }

    // 작성자 확인 및 버튼 표시 처리
    const user = auth.currentUser;
    const isAdmin = user && user.uid === 'TZiwFdqd0qay2sKKGM8SNTINL8s1'; // 관리자 UID를 설정
    // 작성자 또는 관리자인 경우 버튼 표시
    if (user && (postData.authorId === user.uid || isAdmin)) {
        document.querySelector('.postContentAction').style.display = 'flex';
        document.getElementById('editPostButton').onclick = () => enableEditMode(currentPostId);
        document.getElementById('deletePostButton').onclick = () => handleDeleteButtonClick(currentPostId);
    } else {
        document.querySelector('.postContentAction').style.display = 'none';
    }

    // 댓글 로드 및 실시간 댓글 개수 업데이트
    loadComments(currentPostId);
    listenForCommentUpdates(currentPostId);
}


// 댓글 바텀시트 올라오게
function initCommentSheet() {
    const postCommentBox = document.querySelector('.postCommentBox');
    const bottomSheet = document.querySelector('.postCommentBottomSheet');
    const overlay = document.querySelector('.bottomSheetOverlay');

    if (postCommentBox) {
        postCommentBox.addEventListener('click', function () {
            // 바텀시트와 오버레이를 활성화
            bottomSheet.classList.add('active');
            overlay.classList.add('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function () {
            // 바텀시트와 오버레이를 비활성화
            bottomSheet.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// 댓글 작성하고 제출하기
async function submitComment() {
    const commentInput = document.getElementById('commentText');
    const commentText = commentInput.value.trim();
    const postId = document.querySelector('.commentList').getAttribute('data-post-id');

    if (!commentText) {
        alert('Add comment. \n댓글을 입력해주세요.');
        return;
    }

    const user = auth.currentUser;

    try {
        // Firestore에서 사용자 닉네임 가져오기
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const nickname = userData.nickName;  // 사용자의 닉네임을 가져옴

        // 댓글 Firestore에 추가
        await addDoc(collection(db, 'comments'), {
            postId: postId,  // 댓글이 속한 게시물의 ID 저장
            text: commentText,
            authorId: user.uid,
            authorNickname: nickname,  // 닉네임 저장
            createdAt: new Date()
        });

        commentInput.value = '';  // 댓글 입력창 초기화
        loadComments(postId);  // 댓글 다시 로드

    } catch (error) {
        console.error('Failed to post comment:', error);
        alert('Failed to post comment.\n댓글 작성에 실패했습니다.');
    }
}

document.getElementById('submitComment').addEventListener('click', submitComment);

async function loadComments(postId) {
    const commentList = document.querySelector('.commentList');
    const commentCountElement = document.getElementById('commentCount');
    commentList.innerHTML = '';  // 기존 댓글 초기화

    const commentsQuery = query(
        collection(db, 'comments'),
        where('postId', '==', postId),  // 해당 게시물의 ID로 필터링
        orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(commentsQuery);

    // 댓글 개수 설정
    const commentCount = querySnapshot.size; // 댓글 개수
    commentCountElement.textContent = commentCount;

    querySnapshot.forEach((doc) => {
        const commentData = doc.data();
        const commentItem = document.createElement('div');
        commentItem.classList.add('commentItem');
        commentItem.innerHTML = `
            <p><strong>${commentData.authorNickname}</strong>: ${commentData.text}</p>
        `;

        const user = auth.currentUser;
        const isAdmin = user && user.uid === 'TZiwFdqd0qay2sKKGM8SNTINL8s1'; // 관리자 UID를 설정
        if (user && (user.uid === commentData.authorId || isAdmin)) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'delete comment';
            deleteButton.classList.add('commentDeleteButton');
            deleteButton.addEventListener('click', () => deleteComment(doc.id, postId));
            commentItem.appendChild(deleteButton);
        }

        commentList.appendChild(commentItem);
    });
}

async function deleteComment(commentId, postId) {
    try {
        await deleteDoc(doc(db, 'comments', commentId));
        // alert('댓글이 삭제되었습니다.');  // 댓글 삭제 완료 메시지
        loadComments(postId);  // 댓글 다시 로드
    } catch (error) {
        console.error('Failed to delete comment:', error);
        alert('Failed to delete comment.\n댓글 삭제에 실패했습니다.');
    }
}

function listenForCommentUpdates(postId) {
    const commentCountElement = document.getElementById('commentCount');
    const commentsRef = query(
        collection(db, 'comments'),
        where('postId', '==', postId)
    );

    // Firestore 실시간 업데이트
    onSnapshot(commentsRef, (snapshot) => {
        // 댓글 개수 업데이트
        commentCountElement.textContent = snapshot.size;
    });
}

// contact Firestore에 데이터 저장하는 함수
async function saveContactFormData(email, name, message) {
    try {
        const docRef = await addDoc(collection(db, 'contactMessages'), {
            email: email,
            name: name,
            message: message,
            createdAt: new Date()
        });
        console.log('Document written with ID: ', docRef.id);
        alert('Your message has been sent!');
    } catch (error) {
        console.error('Error adding document: ', error);
        alert('There was an error sending your message. Please try again.');
    }
}

// contact 폼 제출 이벤트 처리
document.getElementById('contactForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // 폼 제출 기본 동작 방지

    // 입력된 데이터 수집
    const email = document.getElementById('contactEmail').value.trim();
    const name = document.getElementById('contactName').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!email || !name || !message) {
        alert('All fields are required.');
        return;
    }

    // 데이터베이스에 저장
    await saveContactFormData(email, name, message);

    // 폼 초기화
    document.getElementById('contactForm').reset();
});

