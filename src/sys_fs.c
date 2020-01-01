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
#include <sys/ioctl.h>
#include <sys/utsname.h>
#include "duktape.h"
#include "sys_fs.h"
#include "textbuffer.h"

// ============================================================================
// FUNCTION sys_cd
// ============================================================================
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

// ============================================================================
// FUNCTION sys_cwd
// ============================================================================
duk_ret_t sys_cwd (duk_context *ctx) {
    char buf[1024];
    
    getcwd (buf, 1023);
    buf[1023] = 0;
    duk_push_string (ctx, buf);
    return 1;
}

// ============================================================================
// FUNCTION sys_dir
// ============================================================================
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

// ============================================================================
// FUNCTION sys_glob
// ============================================================================
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

// ============================================================================
// FUNCTION sys_read
// ============================================================================
duk_ret_t sys_read (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    size_t maxsz;
    struct stat st;
    int filno;
    size_t rdsz = 0;
    char buffer[8192];
    const char *path = duk_to_string (ctx, 0);
    if (duk_get_top (ctx) > 1) {
        maxsz = duk_get_int (ctx, 1);
    }
    else {
        maxsz = (1024 * 1024); /* Max 1 MB */
    }
    
    if (stat (path, &st)) return 0;
    
    filno = open (path, O_RDONLY);
    if (filno < 0) {
        return 0;
    }
    
    struct textbuffer *t = textbuffer_alloc();

    rdsz = 8192;
    if (rdsz > maxsz) rdsz = maxsz;
    
    while ((t->wpos < maxsz) &&
           (rdsz = read (filno, buffer, rdsz))>0) {
        textbuffer_add_data (t, buffer, rdsz);
        rdsz = 8192;
        if ((t->wpos + rdsz) > maxsz) {
            rdsz = (maxsz - t->wpos);
        }
    }
    
    close (filno);
    duk_push_string (ctx, t->alloc);
    textbuffer_free (t);
    return 1;
}

// ============================================================================
// FUNCTION sys_write
// ============================================================================
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
    size_t wrsz = 0;
    size_t rdoffs = 0;
    size_t wres;
    
    sz = (size_t) strlen (data);
    
    while (1) {
        wres = write (filno, data+rdoffs, sz);
        if (wres>0) wrsz += wres;
        if (wres<=0) break;
        rdoffs += wrsz;
        if (rdoffs >= sz) break;
    }
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

// ============================================================================
// DATA username/groupname cache for stat data
// ============================================================================
struct xidcache {
    unsigned int id;
    char name[64];
};

static struct xidcache uidcache[16];
static struct xidcache gidcache[16];
static int uidcpos;
static int gidcpos;

// ============================================================================
// FUNCTION cgetuid
// ----------------
// Resolves a uid to a username.
// ============================================================================
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

// ============================================================================
// FUNCTION cgetgid
// ----------------
// Resolves a gid to a groupname.
// ============================================================================
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

// ============================================================================
// FUNCTION modestring
// -------------------
// Converts a filesystem mode to an ls-style listing.
// ============================================================================
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

// ============================================================================
// FUNCTION sys_stat
// ============================================================================
duk_ret_t sys_stat (duk_context *ctx) {
    char modestr[16];
    char linkbuf[256];
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    struct stat st;
    duk_idx_t obj_idx = duk_push_object (ctx);
    
    if (lstat (path, &st) != 0) return 0;
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
    duk_push_boolean (ctx, S_ISSOCK(st.st_mode)?1:0);
    duk_put_prop_string (ctx, obj_idx, "isSocket");
    
    // The answer to 'isExecutable' is relative to the user asking that
    // question. 
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
    
    // Handle softlinks
    duk_push_boolean (ctx, S_ISLNK(st.st_mode)?1:0);
    duk_put_prop_string (ctx, obj_idx, "isLink");
    
    if (S_ISLNK(st.st_mode)) {
        linkbuf[0] = linkbuf[255] = 0;
        size_t sz = readlink (path, linkbuf, 255);
        if (sz>0 && sz<256) linkbuf[sz] = 0;
        duk_push_string (ctx, linkbuf);
        duk_put_prop_string (ctx, obj_idx, "linkTarget");
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_mkdir
// ============================================================================
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

// ============================================================================
// FUNCTION sys_chmod
// ============================================================================
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

// ============================================================================
// FUNCTION sys_chown
// ============================================================================
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
