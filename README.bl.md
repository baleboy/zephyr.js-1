Increasing the X86 partition size on the Arduino 101
====================================================

For a detailed description, skip to section two.

Bare minimum instructions
-------------------------
**WARNING:** *Only try this with an Arduino 101 in factory condition, or which was last
   flashed successfully with ```blresize``` / ```blflash```*

The following instruction have been tested on linux only and are known to work on at least
*Ubuntu 14.04*.

1. Run ```source zjs-env.sh``` to set up the environment
2. Check out all the dependencies of this repo with ```deps/getrepos```
3. Install the packages required by the Intel firmware tools:
```
   $ sudo apt-get install gawk wget git-core diffstat unzip texinfo gcc-multilib build-essential chrpath libsdl1.2-dev xterm libqtgui4:i386 libtool              libc6:i386 l ibc6-dev-i386 autoconf libtool pkg-config gperf flex bison
```
4. Connect the Arduino 101 using a USB Type-A to Type-B cable (*so-called printer style*)
5. Hit *master reset* on the Arduino 101 a few seconds before the next step. This makes the
   device go into DFU mode.
6. Run ```blresize``` with the new partition size you want, e.g.:
```
   $ blresize 256
```
     It should break out if errors are detected in building, etc, but as this is
     a new tool it wouldn't hurt to leaf through the output yourself before
     flashing at the end.


Detailed instructions
---------------------
The following sections gives you all the gory details.

###Arduino 101 and DFU support

Arduino 101 comes with a **144K X86** partition and **152K ARC** partition, along with
a 60K boot partition and a few other details using up the 384K SoC flash.

The bootloader on Arduino 101 has support for DFU firmware update over a USB
cable. The DFU code is active for just a few seconds after you reset or
power on the device. You can use install ```dfu-util``` on an Ubuntu system the following way:
```
$ sudo apt-get install dfu-util
```

Then, during that DFU time-window after reset, you can check the available DFU
partitions:
```
$ dfu-util -l
```

You can also use our tool ```bldetect```. Assuming your environment is set up, having
*sourced* the ```zjs_env.sh``` file, during that DFU window, you can run:
```
$ bldetect
```

This will determine the size of the X86, ARC, and boot partitions.

If X86 is still 144K your device may be in factory condition. But it could also
be that you have used JTAG to flash Zephyr onto the device using the older
method.

The preferred way for flashing your device is to use DFU going forward, but
if it has been flashed with JTAG, you need to first restore it to **factory
condition**.

**WARNING**: *We've bricked a few devices trying to do that, so beware.*

###Updating the bootloader

The bootloader is what runs that DFU "server" and reports the locations of the
various partitions, so in order to change the size of those partitions we need
to change the bootloader.

Intel released the bootloader source here:
https://downloadcenter.intel.com/download/25832

We have cloned that code into our ```otc_zjs-a101fw``` repo. If you run
```deps/getrepos``` you will pull down that repo into our ```deps/``` subdirectory.

We have made some patches to the bootloader to support a 216K or 256K X86
partition at the expense of a smaller ARC partition.

The DFU server code makes the bootloader partition **read-only**, but they've
implemented a clever trick to allow for bootloader updates. You flash the new
bootloader to the ARC partition, and a "boot updater" to the X86 partition,
which they have also provided within the firmware source. You then reboot, and
the X86 core launches this boot updater, which simply copies the first part of
the ARC partition over to the boot partition. So now the bootloader is updated.

Changing sizes is a little tricky. You need to flash the new bootloader to the
ARC partition, but then you need a boot updater that still remembers where the
old partition was, because that's where you have just flashed it.

To handle this trickery, we've created the ```blresize``` tool. Before you run it the
first time, the Arduino should be in factory condition. Specifically that means
the original bootloader at the beginning of the flash, and the X86 partition
starting after 32 2K pages, and the ARC partition starting after 104 2K pages,
from the beginning of the flash.

If you used JTAG to flash Zephyr onto the
device, it put partitions in a different order which will screw
up this process. Unfortunately by default with JTAG, the X86 partition is still 144K so
you won't be able to tell the difference by running ```bldetect```. We'll try to come
up with some way of checking later to make things safer.

As long as you haven't changed your partitions before, ```blresize``` should be able
to safely transition back and forth between 144k, 216k, and 256k sizes. When
you go back to 144k, it should be in factory condition again.

So ```blresize``` will first build the firmware at your current size, e.g. 144k. This
is to get the boot updater that expects to find the ARC partition at the default
104-page offset. Right now it builds everything so it takes a while, but we
should be able to build just the boot updater at some point. It saves a copy of
the boot updater.

Next, it builds everything at the new desired size. Then it creates a
"flashpack" which is a zipfile that pulls together everything needed for
flashing. But the boot updater there is looking for a bootloader at the new
ARC partition offset, so we patch it with the old updater.

Finally, ```blresize``` runs ```blflash``` which launches the ```flash_dfu.sh```
tool inside the flashpack. This flashes the (new) bootloader to the ARC partition, the (old)
updater to the X86 partition, and reboots the device to let the updater do its
magic, and then flashes some Zephyr images onto the two partitions, which don't
seem to do anything but at least prevent running boot updater again and again.

###Getting Zephyr to work with the new bootloader

Now the device should be ready to receive Zephyr images. An important
consideration is that Zephyr also needs to know about the partition size you're
using. For now we have bl216 and bl256 branches in our ```deps/zephyr``` repo that
you can check out depending on which size you're using. (Just use master if you
want the default 144k.) The patch is very small and just updates a couple
numbers referring to the offset the ARC partition starts at.

If you try to use a Zephyr that thinks the ARC partition is in the wrong place,
here's what you'll see: When you flash both X86 and ARC images, you will see
nothing on serial console. But if you set ```CONFIG_ARC_INIT=n``` in your prj.conf
and build and flash the X86 image, it will work. This is because ARC is unable
to boot since it's trying to start at a bogus flash offset, and the way it's
written, X86 can't run either if it fails to initialize the ARC side.

You can fix this by either using blresize to make your device match what Zephyr
expects, or check out the branches above to make Zephyr match the device. Again,
you can use bldetect to see what size your device has and know which branch to
use.

###Using other partition sizes

The patches are pretty simple, as long as you're careful and understand the
offset math involved, you can change them. One consideration is that for the
boot updater to work you need to be sure there's enough space on the ARC
partition to hold a copy of the bootloader. Right now it's about 40,500 bytes,
so just under 40k as defined by respectable programmers. So the 256k/40k split
is as big as we can get with these techniques.

###Doing even better

Ideas for improvements:

- The boot updater could be rewritten to have the new bootloader right inside
its own image, either appended, or dd'd into a waiting static buffer, or
something. This would save a lot of headaches as it would no longer require
shuffling an old updater with a new bootloader, and the ARC partition wouldn't
even be used for updating so it could be as small as you can afford.
- The boot partition is larger than needed right now. It could be 40k but it's
60k. Tweaking this would move the start of the x86 partition which will cause
more issues and make it easier to brick your device though, so be careful.

So you've bricked your device
-----------------------------
I don't *think* you can actually destroy your device with any of these DFU
commands, but you want to make sure you do the right JTAG command to restore it
or you really can destroy it. Trust me, we've done it. So find someone really
smart before you hit Enter on that.