#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <time.h>
#include <pwd.h>
#include <glob.h>
#include <fcntl.h>
#include <dirent.h>
#include <strings.h>
#include <grp.h>
#include <sys/stat.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/errno.h>
#include <sys/wait.h>
#include <strings.h>
#include "duktape.h"

char *mystrdup (const char *orig) {
    size_t len = strlen (orig);
    char *res = (char *) malloc (len+1);
    strcpy (res, orig);
    return res;
}

duk_ret_t sys_cd (duk_context *ctx) {
    const char *path;
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    path = duk_to_string (ctx, 0);
    if (path) {
        if (chdir (path) == 0) {
            duk_push_boolean (ctx, 1);
        }
        else {
            duk_push_boolean (ctx, 0);
        }
        return 1;
    }
    return 0;
}

duk_ret_t sys_cwd (duk_context *ctx) {
    char buf[1024];
    
    getcwd (buf, 1023);
    buf[1023] = 0;
    duk_push_string (ctx, buf);
    return 1;
}

duk_ret_t sys_dir (duk_context *ctx) {
    const char *path;
    DIR *dir;
    struct dirent *de;
    duk_idx_t arr_idx;
    int i = 0;
    
    if (duk_get_top (ctx) == 0) {
        path = ".";
    }
    else {
        path = duk_to_string (ctx, 0);
    }
    
    arr_idx = duk_push_array (ctx);
    
    if ((dir = opendir (path))) {
        while ((de = readdir (dir))) {
            duk_push_string (ctx, de->d_name);
            duk_put_prop_index (ctx, arr_idx, i++);
        }
        closedir (dir);            
    }
    return 1;
}

duk_ret_t sys_glob (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    int i = 0;
    const char *match = duk_to_string (ctx, 0);
    duk_idx_t arr_idx = duk_push_array (ctx);
    glob_t *g = (glob_t *) calloc (sizeof (glob_t), 1);
    if (glob (match, 0, NULL, g) == 0) {
        for (i=0; i<g->gl_pathc; ++i) {
            duk_push_string (ctx, g->gl_pathv[i]);
            duk_put_prop_index (ctx, arr_idx, i);
        }
    }
    globfree (g);
    free (g);
    return 1;
}

duk_ret_t sys_setenv (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *key = duk_to_string (ctx, 0);
    const char *value = duk_to_string (ctx, 1);
    
    setenv (key, value, 1);
    return 0;
}

duk_ret_t sys_getenv (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *key = duk_to_string (ctx, 0);
    const char *v = getenv (key);
    if (v) {
        duk_push_string (ctx, v);
        return 1;
    }
    return 0;
}

duk_ret_t sys_read (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    size_t maxsz;
    struct stat st;
    int filno;
    size_t rdsz = 0;
    size_t ressz = 0;
    char *buffer;
    const char *path = duk_to_string (ctx, 0);
    if (duk_get_top (ctx) > 1) {
        maxsz = duk_get_int (ctx, 1);
    }
    else {
        maxsz = (1024 * 1024); /* Max 1 MB */
    }
    
    if (stat (path, &st)) return 0;
    if (st.st_size > maxsz) {
        buffer = (char *) calloc (maxsz+2, 1);
    }
    else {
        buffer = (char *) calloc ((size_t) st.st_size+2, 1);
    }
    
    filno = open (path, O_RDONLY);
    if (filno < 0) {
        return 0;
    }
    
    rdsz = 8192;
    if (rdsz > maxsz) rdsz = maxsz;
    
    while ((ressz < maxsz) && ((rdsz = read (filno, buffer+ressz, rdsz)))) {
        if (rdsz < 0) break;
        ressz += rdsz;
        rdsz = 8192;
        if ((ressz + rdsz) > maxsz) {
            rdsz = (maxsz - ressz);
        }
    }
    
    close (filno);
    duk_push_string (ctx, buffer);
    free (buffer);
    return 1;
}

duk_ret_t sys_write (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *data = duk_to_string (ctx, 0);
    const char *fname = duk_to_string (ctx, 1);
    char *tmpname = (char *) malloc (strlen(fname)+64);
    strcpy (tmpname, fname);
    strcat (tmpname, ".new-XXXXXX");
    
    int mode = 0644;
    if (duk_get_top (ctx) > 2) {
        mode = duk_get_int (ctx, 2);
    }
    int filno;
    
    filno = mkstemp (tmpname);
    if (filno < 0) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    fchmod (filno, mode);
    
    size_t sz;
    size_t wrsz;
    
    sz = (size_t) strlen (data);
    wrsz = write (filno, data, sz);
    close (filno);
    
    if (wrsz == sz) {
        if (rename (tmpname, fname) == 0) {
            free (tmpname);
            duk_push_boolean (ctx, 1);
            return 1;
        }
    }
    
    unlink (tmpname);
    free (tmpname);
    duk_push_boolean (ctx, 0);
    return 1;
}

duk_ret_t sys_print (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    const char *data = duk_to_string (ctx, 0);
    write (1, data, strlen(data));
    return 0;
}

struct xidcache {
    unsigned int id;
    char name[64];
};

static struct xidcache uidcache[16];
static struct xidcache gidcache[16];
static int uidcpos;
static int gidcpos;

const char *cgetuid (uid_t uid) {
    struct passwd *pwd;
    char buffer[32];
    const char *namefield;
    const char *res;
    
    if (! uid) return "root";
    for (int i=0; i<16; ++i) {
        if (uidcache[i].id == (unsigned int) uid) return uidcache[i].name;
    }
    
    pwd = getpwuid (uid);
    if (! pwd) {
        sprintf (buffer, "#%i", (int) uid);
        namefield = buffer;
    }
    else {
        namefield = pwd->pw_name;
    }
    uidcache[uidcpos].id = (unsigned int) uid;
    strncpy (uidcache[uidcpos].name, namefield, 63);
    res = uidcache[uidcpos].name;
    uidcpos = (uidcpos+1) & 15;
    return res;
}

const char *cgetgid (gid_t gid) {
    struct group *grp;
    char buffer[32];
    const char *namefield;
    const char *res;
    
    if (! gid) return "root";
    for (int i=0; i<16; ++i) {
        if (gidcache[i].id == (unsigned int) gid) return gidcache[i].name;
    }
    
    grp = getgrgid (gid);
    if (! grp) {
        sprintf (buffer, "#%i", (int) gid);
        namefield = buffer;
    }
    else {
        namefield = grp->gr_name;
    }
    gidcache[gidcpos].id = (unsigned int) gid;
    strncpy (gidcache[gidcpos].name, namefield, 63);
    res = gidcache[gidcpos].name;
    gidcpos = (gidcpos+1) & 15;
    return res;
}

void modestring (char *into, mode_t mode) {
    char tp = '-';
    if (S_ISFIFO(mode)) tp = 'f';
    else if (S_ISCHR(mode)) tp = 'c';
    else if (S_ISDIR(mode)) tp = 'd';
    else if (S_ISBLK(mode)) tp = 'b';
    else if (S_ISLNK(mode)) tp = 'l';
    else if (S_ISSOCK(mode)) tp = 's';

    into[0] = tp;
    into[1] = (mode & 0400) ? 'r' : '-';
    into[2] = (mode & 0200) ? 'w' : '-';
    into[3] = (mode & 0100) ? (mode & 04000) ? 's' : 'x' : '-';
    into[4] = (mode & 0040) ? 'r' : '-';
    into[5] = (mode & 0020) ? 'w' : '-';
    into[6] = (mode & 0010) ? (mode & 02000) ? 's' : 'x' : '-';
    into[7] = (mode & 0004) ? 'r' : '-';
    into[8] = (mode & 0002) ? 'w' : '-';
    into[9]= (mode & 0001) ? (mode & 01000) ? 's' : 'x' : '-';
    into[10] = 0;
}

duk_ret_t sys_stat (duk_context *ctx) {
    char modestr[16];
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    struct stat st;
    duk_idx_t obj_idx = duk_push_object (ctx);
    
    if (stat (path, &st) != 0) return 0;
    duk_push_int (ctx, st.st_mode);
    duk_put_prop_string (ctx, obj_idx, "mode");
    modestring (modestr, st.st_mode);
    duk_push_string (ctx, modestr);
    duk_put_prop_string (ctx, obj_idx, "modeString");
    duk_push_int (ctx, st.st_uid);
    duk_put_prop_string (ctx, obj_idx, "uid");
    duk_push_string (ctx, cgetuid (st.st_uid));
    duk_put_prop_string (ctx, obj_idx, "user");
    duk_push_int (ctx, st.st_gid);
    duk_put_prop_string (ctx, obj_idx, "gid");
    duk_push_string (ctx, cgetgid (st.st_gid));
    duk_put_prop_string (ctx, obj_idx, "group");
    duk_push_number (ctx, (double) st.st_size);
    duk_put_prop_string (ctx, obj_idx, "size");
    
    double atime = st.st_atime;
    duk_eval_string(ctx, "Date");
    duk_push_number (ctx, 1000.0 * atime);
    duk_pnew (ctx,1);
    duk_put_prop_string (ctx, obj_idx, "atime");
    
    double mtime = st.st_mtime;
    duk_eval_string(ctx, "Date");
    duk_push_number (ctx, 1000.0 * mtime);
    duk_pnew (ctx,1);
    duk_put_prop_string (ctx, obj_idx, "mtime");

    double ctime = st.st_ctime;
    duk_eval_string(ctx, "Date");
    duk_push_number (ctx, 1000.0 * ctime);
    duk_pnew (ctx,1);
    duk_put_prop_string (ctx, obj_idx, "ctime");

    duk_push_boolean (ctx, S_ISDIR(st.st_mode)?1:0);
    duk_put_prop_string (ctx, obj_idx, "isDir");
    if (S_ISCHR(st.st_mode) || S_ISBLK(st.st_mode)) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    duk_put_prop_string (ctx, obj_idx, "isDevice");
    duk_push_boolean (ctx, S_ISLNK(st.st_mode)?1:0);
    duk_put_prop_string (ctx, obj_idx, "isLink");
    duk_push_boolean (ctx, S_ISSOCK(st.st_mode)?1:0);
    duk_put_prop_string (ctx, obj_idx, "isSocket");
    uid_t myuid = geteuid();
    gid_t mygid = getegid();
    if (S_ISDIR(st.st_mode)) {
        duk_push_boolean (ctx, 0);
    }
    else if ((st.st_mode & 0100) && st.st_uid == myuid) {
        duk_push_boolean (ctx, 1);
    }
    else if ((st.st_mode & 0010) && st.st_gid == mygid) {
        duk_push_boolean (ctx, 1);
    }
    else if (st.st_mode & 0001) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    duk_put_prop_string (ctx, obj_idx, "isExecutable");
    return 1;
}

duk_ret_t sys_mkdir (duk_context *ctx) {
    int mode = 0755;
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    if (duk_get_top (ctx) > 1) {
        mode = duk_get_int (ctx, 1);
    }
    if (mkdir (path, mode) == 0) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    return 1;
}

duk_ret_t sys_chmod (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    int mode = duk_get_int (ctx, 1);
    if (chmod (path, mode) == 0) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    return 1;
}

duk_ret_t sys_chown (duk_context *ctx) {
    if (duk_get_top (ctx) < 3) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    int uid = duk_get_int (ctx, 1);
    int gid = duk_get_int (ctx, 2);
    if (chown (path, (uid_t) uid, (gid_t) gid) == 0) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    return 1;
}

void pushpasswd (duk_context *ctx, struct passwd *pw) {
    duk_idx_t obj_idx = duk_push_object (ctx);
    duk_push_string (ctx, pw->pw_name);
    duk_put_prop_string (ctx, obj_idx, "name");
    duk_push_int (ctx, (int) pw->pw_uid);
    duk_put_prop_string (ctx, obj_idx, "uid");
    duk_push_int (ctx, (int) pw->pw_gid);
    duk_put_prop_string (ctx, obj_idx, "gid");
    duk_push_string (ctx, pw->pw_gecos);
    duk_put_prop_string (ctx, obj_idx, "gecos");
    duk_push_string (ctx, pw->pw_dir);
    duk_put_prop_string (ctx, obj_idx, "home");
    duk_push_string (ctx, pw->pw_shell);
    duk_put_prop_string (ctx, obj_idx, "shell");
}

duk_ret_t sys_getpwnam (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *username = duk_to_string (ctx, 0);
    struct passwd *pw = getpwnam (username);
    if (! pw) return 0;
    pushpasswd (ctx, pw);
    return 1;
}

duk_ret_t sys_getpwuid (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    uid_t uid = (uid_t) duk_get_int (ctx, 0);
    struct passwd *pw = getpwuid (uid);
    if (! pw) return 0;
    pushpasswd (ctx, pw);
    return 1;
}

duk_ret_t sys_modsearch (duk_context *ctx) {
    struct stat st;
    int filno;
    char *buffer;
    const char *id = duk_to_string (ctx, 0);
    const char *path = getenv("JSH_MODULE_PATH");
    if (! path) path = "./modules";
    char *full = (char *) malloc ((size_t) (strlen(path)+strlen(id)+16));
    char *end;
    strcpy (full, path);
    strcat (full, "/");
    strcat (full, id);
    if (stat (full, &st)) {
        end = full + strlen(full);
        strcpy (end, ".js");
        if (stat (full, &st)) {
            strcpy (end, "/index.js");
            if (stat (full, &st)) {
                free (full);
                fprintf (stderr, "%% Could not load module: '%s'\n", id);
                exit (1);
                return 0;
            }
        }
    }
    buffer = (char *) calloc (st.st_size+1,1);
    filno = open (full, O_RDONLY);
    free (full);
    
    if (filno < 0) {
        free (buffer);
        return 0;
    }
    
    read (filno, buffer, st.st_size);
    duk_push_string (ctx, buffer);
    free (buffer);
    return 1;
}

duk_ret_t sys_run (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int tocmdpipe[2];
    int fromcmdpipe[2];
    int i;
    pid_t pid;
    int fdin;
    int fdout;
    int numarg = 0;
    char **args = NULL;
    const char *command = duk_to_string (ctx, 0);
    const char *senddata = NULL;
    duk_get_prop_string(ctx,1,"length");
    numarg = duk_get_int(ctx,-1);
    duk_pop(ctx);
    
    args = (char **) calloc (sizeof(char*),numarg+2);
    args[0] = mystrdup (command);
    for (i=0; i<numarg; ++i) {
        duk_get_prop_index(ctx,1,i);
        args[i+1] = mystrdup(duk_to_string(ctx,-1));
        duk_pop(ctx);
    }
    args[i+1] = NULL;
    
    if (duk_get_top (ctx) > 2) senddata = duk_to_string (ctx, 2);
    
    pipe (tocmdpipe);
    pipe (fromcmdpipe);
    
    switch (pid = fork()) {
        case -1:
            close (tocmdpipe[0]);
            close (tocmdpipe[1]);
            close (fromcmdpipe[0]);
            close (fromcmdpipe[1]);
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            return 0;
            
        case 0:
            close (0);
            close (1);
            close (2);
            dup2 (tocmdpipe[0], 0);
            dup2 (fromcmdpipe[1], 1);
            dup2 (fromcmdpipe[1], 2);
            for (i=3; i<255;++i) close (i);
            execvp (command, args);
            printf ("Exec failed: %s", strerror (errno));
            exit (0);
    }
    
    close (fromcmdpipe[1]);
    close (tocmdpipe[0]);
    
    fdout = tocmdpipe[1];
    fdin = fromcmdpipe[0];
    
    if (senddata) {
        if (write (fdout, senddata, strlen(senddata)) != strlen(senddata)) {
            close (fdout);
            close (fdin);
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            duk_push_boolean (ctx, 0);
            return 1;
        }
    }
    
    close (fdout);
    
    for (i=0; i<(numarg+1);++i) free (args[i]);
    free (args);
    int retstatus;
    size_t rdsz;
    size_t bufsz = 1024;
    size_t bufpos = 0;
    char *buf = (char *) malloc (1024);
    
    while (1) {
        if (bufpos+256 >= bufsz) {
            bufsz = 2* bufsz;
            buf = (char *) realloc (buf, bufsz);
            if (! buf) break;
        }
        if (waitpid (pid, &retstatus, WNOHANG)) break;
        rdsz = read (fdin, buf+bufpos, 256);
        if (rdsz<1) break;
        bufpos += rdsz;
        buf[bufpos] = 0;
    }
    close (fdin);
    waitpid (pid, &retstatus, 0);

    if (WEXITSTATUS(retstatus) != 0) {
        duk_push_boolean (ctx, 0);
    }
    else {
        if (*buf) {
            duk_push_string (ctx, buf);
        }
        else {
            duk_push_boolean (ctx, 1);
        }
    }
    free (buf);
    return 1;
}

duk_ret_t sys_hostname (duk_context *ctx) {
    char nm[256];
    if (duk_get_top (ctx) == 0) {
        nm[0] = nm[255] = 0;
        gethostname (nm, 255);
        duk_push_string (ctx, nm);
        return 1;
    }
    const char *newnm = duk_to_string (ctx, 0);
    if (sethostname (newnm, strlen(newnm)) == 0) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    return 1;
}

void sys_init (duk_context *ctx) {
    struct stat st;
    int filno;
    char *buffer;
    const char *osglobal;

    bzero (uidcache, 16 * sizeof (struct xidcache));
    bzero (gidcache, 16 * sizeof (struct xidcache));
    uidcpos = gidcpos = 0;
    duk_idx_t obj_idx;
    
    #define PROPFLAGS DUK_DEFPROP_HAVE_VALUE | DUK_DEFPROP_SET_WRITABLE | \
            DUK_DEFPROP_SET_CONFIGURABLE
    
    duk_push_global_object (ctx);
    duk_push_string (ctx, "sys");
    obj_idx = duk_push_object (ctx);
    
    duk_push_string (ctx, "cd");
    duk_push_c_function (ctx, sys_cd, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "cwd");
    duk_push_c_function (ctx, sys_cwd, 0);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "dir");
    duk_push_c_function (ctx, sys_dir, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "glob");
    duk_push_c_function (ctx, sys_glob, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "getenv");
    duk_push_c_function (ctx, sys_getenv, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "setenv");
    duk_push_c_function (ctx, sys_setenv, 2);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "print");
    duk_push_c_function (ctx, sys_print, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);

    duk_push_string (ctx, "read");
    duk_push_c_function (ctx, sys_read, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "write");
    duk_push_c_function (ctx, sys_write, 2);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "run");
    duk_push_c_function (ctx, sys_run, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "mkdir");
    duk_push_c_function (ctx, sys_mkdir, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "chmod");
    duk_push_c_function (ctx, sys_chmod, 2);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "chown");
    duk_push_c_function (ctx, sys_chown, 3);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "getpwnam");
    duk_push_c_function (ctx, sys_getpwnam, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "getpwuid");
    duk_push_c_function (ctx, sys_getpwuid, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "hostname");
    duk_push_c_function (ctx, sys_hostname, DUK_VARARGS);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "stat");
    duk_push_c_function (ctx, sys_stat, 1);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    duk_def_prop (ctx, -3, PROPFLAGS);
    duk_pop (ctx);
    
    duk_get_global_string (ctx, "Duktape");
    duk_push_c_function (ctx, sys_modsearch, 4);
    duk_put_prop_string (ctx, -2, "modSearch");
    duk_pop (ctx);
    
    osglobal = getenv("JSH_GLOBAL");
    if (! osglobal) osglobal = "./modules/jsh-global.js";
    if (stat (osglobal, &st) == 0) {
        buffer = (char *) calloc (st.st_size+1,1);
        filno = open (osglobal, O_RDONLY);
        if (filno >= 0) {
            read (filno, buffer, st.st_size);
            duk_eval_string (ctx, buffer);
        }
        free (buffer);
        close (filno);
    }
}
