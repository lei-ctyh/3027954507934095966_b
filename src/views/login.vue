<template>
  <div class="login">
    <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form" autocomplete="off">
      <h3 class="title">食品饮料进销存后台管理系统</h3>
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          type="text"
          size="large"
          autocomplete="off"
          name="login_username"
          placeholder="账号"
        >
          <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          size="large"
          autocomplete="new-password"
          name="login_password"
          placeholder="密码"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="code" v-if="captchaEnabled">
        <el-input
          v-model="loginForm.code"
          size="large"
          autocomplete="off"
          name="login_code"
          placeholder="验证码"
          style="width: 63%"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
        </el-input>
        <div class="login-code">
          <img :src="codeUrl" @click="getCode" class="login-code-img"/>
        </div>
      </el-form-item>
      <el-form-item style="width:100%; margin-bottom: 10px;">
        <el-checkbox v-model="rememberPassword">记住密码</el-checkbox>
      </el-form-item>
      <el-form-item style="width:100%;">
        <el-button
          :loading="loading"
          size="large"
          type="primary"
          style="width:100%;"
          @click.prevent="handleLogin"
        >
          <span v-if="!loading">登 录</span>
          <span v-else>登 录 中...</span>
        </el-button>

      </el-form-item>
    </el-form>
    <el-dialog
      title="公众号二维码"
      v-model="dialogVisible"
      append-to-body
      :show-close="false"
      width="30%">
      <div style="text-align: center">
        <span class="font-title-large"><span class="color-main font-extra-large">关注公众号</span>回复<span class="color-main font-extra-large">ERP</span>获取体验账号</span>
        <br>
        <img src="@/assets/logo/gzh.jpg" width="160" height="160" style="margin-top: 10px">
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="dialogConfirm">确定</el-button>
        </div>
      </template>
    </el-dialog>
    <!--  底部  -->
    <div class="el-login-footer">
    </div>
  </div>
</template>

<script setup>
import { getCodeImg } from "@/api/login";
import useUserStore from '@/store/modules/user'
import cache from '@/plugins/cache'

const userStore = useUserStore()
const router = useRouter();
const route = useRoute();
const { proxy } = getCurrentInstance();

const loginForm = ref({
  username: "",
  password: "",
  code: "",
  uuid: ""
});

const REMEMBER_LOGIN_KEY = 'ruoyi-erp:rememberLogin'
const REMEMBER_LOGIN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const rememberPassword = ref(false)

const currentYear = new Date().getFullYear();

const loginRules = {
  username: [{ required: true, trigger: "blur", message: "请输入您的账号" }],
  password: [{ required: true, trigger: "blur", message: "请输入您的密码" }],
  code: [{ required: true, trigger: "change", message: "请输入验证码" }]
};

const codeUrl = ref("");
const loading = ref(false);
// 验证码开关
const captchaEnabled = ref(true);
// 注册开关
const register = ref(false);
const redirect = ref(undefined);
const dialogVisible = ref(false);

redirect.value = route.query.redirect;

function loadRememberedLogin() {
  const rawRemembered = cache.local.get(REMEMBER_LOGIN_KEY)
  if (!rawRemembered) return

  let remembered
  try {
    remembered = JSON.parse(rawRemembered)
  } catch (error) {
    cache.local.remove(REMEMBER_LOGIN_KEY)
    return
  }
  if (!remembered || typeof remembered !== 'object') return

  const expiresAt = Number(remembered.expiresAt || 0)
  if (!expiresAt || Date.now() > expiresAt) {
    cache.local.remove(REMEMBER_LOGIN_KEY)
    return
  }

  loginForm.value.username = remembered.username || ''
  loginForm.value.password = remembered.password || ''
  rememberPassword.value = true
}

function saveRememberedLogin() {
  cache.local.setJSON(REMEMBER_LOGIN_KEY, {
    username: loginForm.value.username,
    password: loginForm.value.password,
    expiresAt: Date.now() + REMEMBER_LOGIN_TTL_MS
  })
}

watch(rememberPassword, (enabled) => {
  if (!enabled) {
    cache.local.remove(REMEMBER_LOGIN_KEY)
  }
})

function handleTry(){
  dialogVisible.value =true
}
function dialogConfirm(){
  dialogVisible.value =false;
}

function handleLogin() {
  proxy.$refs.loginRef.validate(valid => {
    if (valid) {
      loading.value = true;
      // 调用action的登录方法
      userStore.login(loginForm.value).then(() => {
        if (rememberPassword.value) {
          saveRememberedLogin()
        } else {
          cache.local.remove(REMEMBER_LOGIN_KEY)
        }
        router.push(redirect.value || "/");
      }).catch(() => {
        loading.value = false;
        // 重新获取验证码
        if (captchaEnabled.value) {
          getCode();
        }
      });
    }
  });
}

function getCode() {
  getCodeImg().then(res => {
    captchaEnabled.value = res.data.captchaEnabled === undefined ? true : res.data.captchaEnabled;
    if (captchaEnabled.value) {
      codeUrl.value = "data:image/gif;base64," + res.data.img;
      loginForm.value.uuid = res.data.uuid;
    }
  });
}

getCode();
loadRememberedLogin();
</script>

<style lang='scss' scoped>
.color-main {
  color: #409EFF;
}
.font-extra-large {
  font-size: 20px;
}
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-image: url("../assets/images/login-background.jpg");
  background-size: cover;
}
.title {
  margin: 0px auto 30px auto;
  text-align: center;
  color: #707070;
}

.login-form {
  border-radius: 6px;
  background: #ffffff;
  width: 400px;
  padding: 25px 25px 5px 25px;
  .el-input {
    height: 40px;
    input {
      height: 40px;
    }
  }
  .input-icon {
    height: 39px;
    width: 14px;
    margin-left: 0px;
  }
}
.login-tip {
  font-size: 13px;
  text-align: center;
  color: #bfbfbf;
}
.login-code {
  width: 33%;
  height: 40px;
  float: right;
  img {
    cursor: pointer;
    vertical-align: middle;
  }
}
.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #fff;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}
.login-code-img {
  height: 40px;
  padding-left: 12px;
}
</style>
